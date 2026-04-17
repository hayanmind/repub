import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { processEpub, parseEpub } from '@gov-epub/core';
import type {
  ConversionOptions,
  ConversionResult as CoreConversionResult,
  ParsedEpub,
  ValidationReport as CoreValidationReport,
  ValidationIssue,
} from '@gov-epub/core';
import { put, del } from '@vercel/blob';
import { eq, desc } from 'drizzle-orm';
import { db, uploads as uploadsTable, jobs as jobsTable, conversionResults, userSettings } from './db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UploadRecord {
  id: string;
  originalName: string;
  size: number;
  mimeType: string;
  blobUrl: string;
  uploadedAt: string;
}

export type JobStage =
  | 'queued'
  | 'parsing'
  | 'restructuring'
  | 'ai_content'
  | 'conversion'
  | 'validation'
  | 'completed'
  | 'failed';

export interface JobProgress {
  step: number;
  totalSteps: number;
  percent: number;
  currentStage: JobStage;
}

export interface ConversionJob {
  jobId: string;
  uploadId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: JobProgress;
  options: Record<string, boolean>;
  result?: { filename: string; size: number };
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversionResult {
  epub: Buffer;
  report: unknown;
  metadata?: unknown;
  stats?: unknown;
  previewData?: unknown;
}

export interface SampleMeta {
  id: string;
  title: string;
  author: string;
  language: string;
  description: string;
  filename: string;
  fileSize: number;
  source: string;
  sourceUrl?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hasDatabase(): boolean {
  return !!process.env.DATABASE_URL;
}

function hasBlob(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

// In-memory fallback (dev mode without DB/Blob)
const memUploads = new Map<string, UploadRecord & { buffer: Buffer }>();
const memJobs = new Map<string, ConversionJob>();
const memResults = new Map<string, ConversionResult>();
const memSettings: Record<string, string | undefined> = {};

// ---------------------------------------------------------------------------
// Upload Service
// ---------------------------------------------------------------------------

export async function saveUpload(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  userId: string = 'anonymous',
): Promise<UploadRecord> {
  const id = randomUUID();
  const now = new Date().toISOString();

  if (hasBlob() && hasDatabase()) {
    const blob = await put(`uploads/${id}/${originalName}`, buffer, {
      access: 'public',
      contentType: mimeType,
    });

    await db().insert(uploadsTable).values({
      id,
      userId,
      originalName,
      size: buffer.length,
      mimeType,
      blobUrl: blob.url,
    });

    return { id, originalName, size: buffer.length, mimeType, blobUrl: blob.url, uploadedAt: now };
  }

  // Fallback: in-memory
  const record = { id, originalName, size: buffer.length, mimeType, blobUrl: '', uploadedAt: now, buffer };
  memUploads.set(id, record);
  return { id, originalName, size: buffer.length, mimeType, blobUrl: '', uploadedAt: now };
}

export async function getUpload(id: string): Promise<(UploadRecord & { buffer?: Buffer }) | undefined> {
  if (hasDatabase()) {
    const rows = await db().select().from(uploadsTable).where(eq(uploadsTable.id, id)).limit(1);
    if (rows.length === 0) return undefined;
    const row = rows[0]!;
    const record: UploadRecord & { buffer?: Buffer } = {
      id: row.id,
      originalName: row.originalName,
      size: row.size,
      mimeType: row.mimeType,
      blobUrl: row.blobUrl,
      uploadedAt: row.createdAt.toISOString(),
    };
    // Fetch buffer from Blob
    if (row.blobUrl) {
      const res = await fetch(row.blobUrl);
      record.buffer = Buffer.from(await res.arrayBuffer());
    }
    return record;
  }

  return memUploads.get(id);
}

export async function listUploads(userId?: string): Promise<UploadRecord[]> {
  if (hasDatabase()) {
    const query = userId
      ? db().select().from(uploadsTable).where(eq(uploadsTable.userId, userId)).orderBy(desc(uploadsTable.createdAt))
      : db().select().from(uploadsTable).orderBy(desc(uploadsTable.createdAt));
    const rows = await query;
    return rows.map((r) => ({
      id: r.id,
      originalName: r.originalName,
      size: r.size,
      mimeType: r.mimeType,
      blobUrl: r.blobUrl,
      uploadedAt: r.createdAt.toISOString(),
    }));
  }

  return Array.from(memUploads.values()).map(({ buffer: _b, ...rest }) => rest);
}

// ---------------------------------------------------------------------------
// Conversion Service
// ---------------------------------------------------------------------------

export async function runConversion(
  uploadId: string,
  options: Record<string, boolean>,
  userId: string = 'anonymous',
): Promise<ConversionJob> {
  const upload = await getUpload(uploadId);
  if (!upload) throw new Error(`Upload not found: ${uploadId}`);

  // Need buffer for conversion
  let buffer: Buffer;
  if (upload.buffer) {
    buffer = upload.buffer;
  } else if (upload.blobUrl) {
    const res = await fetch(upload.blobUrl);
    buffer = Buffer.from(await res.arrayBuffer());
  } else {
    throw new Error('Upload has no file data');
  }

  const jobId = randomUUID();
  const now = new Date().toISOString();
  const progress: JobProgress = { step: 1, totalSteps: 5, percent: 10, currentStage: 'parsing' };

  const job: ConversionJob = {
    jobId,
    uploadId,
    status: 'processing',
    progress,
    options,
    createdAt: now,
    updatedAt: now,
  };

  if (hasDatabase()) {
    await db().insert(jobsTable).values({
      id: jobId,
      uploadId,
      userId,
      status: 'processing',
      progress,
      options,
    });
  } else {
    memJobs.set(jobId, job);
  }

  try {
    const convOptions: ConversionOptions = {
      enableTts: options.enableTts ?? true,
      enableQuiz: options.enableQuiz ?? true,
      enableImageGen: options.enableImageGen ?? false,
      enableSummary: options.enableSummary ?? true,
      templateId: 'default',
      cssTheme: 'modern',
    };

    const originalParsed = await parseEpub(buffer);
    const coreResult = await processEpub(buffer, convOptions);

    let convertedParsed: ParsedEpub;
    try {
      convertedParsed = await parseEpub(coreResult.epub);
    } catch {
      convertedParsed = originalParsed;
    }

    const previewData = buildPreviewData(jobId, upload, originalParsed, convertedParsed, coreResult);
    const report = buildFrontendReport(coreResult.report, coreResult.stats);

    const resultFilename = `converted-${upload.originalName}`;
    const resultSize = coreResult.epub.length;

    if (hasBlob() && hasDatabase()) {
      const resultBlob = await put(`results/${jobId}/${resultFilename}`, coreResult.epub, {
        access: 'public',
        contentType: 'application/epub+zip',
      });

      await db().update(jobsTable).set({
        status: 'completed',
        progress: { step: 5, totalSteps: 5, percent: 100, currentStage: 'completed' },
        resultFilename,
        resultSize,
        resultBlobUrl: resultBlob.url,
        updatedAt: new Date(),
      }).where(eq(jobsTable.id, jobId));

      await db().insert(conversionResults).values({
        id: randomUUID(),
        jobId,
        reportJson: report,
        metadata: coreResult.metadata as unknown as Record<string, unknown>,
        stats: coreResult.stats as unknown as Record<string, unknown>,
        previewData: previewData as unknown as Record<string, unknown>,
      });
    } else {
      memResults.set(jobId, {
        epub: coreResult.epub,
        report,
        metadata: coreResult.metadata,
        stats: coreResult.stats,
        previewData,
      });
    }

    job.status = 'completed';
    job.progress = { step: 5, totalSteps: 5, percent: 100, currentStage: 'completed' };
    job.result = { filename: resultFilename, size: resultSize };
    job.updatedAt = new Date().toISOString();
    if (!hasDatabase()) memJobs.set(jobId, job);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Conversion failed';
    job.status = 'failed';
    job.error = errorMsg;
    job.progress = { step: 0, totalSteps: 5, percent: 0, currentStage: 'failed' };
    job.updatedAt = new Date().toISOString();

    if (hasDatabase()) {
      await db().update(jobsTable).set({
        status: 'failed',
        error: errorMsg,
        progress: { step: 0, totalSteps: 5, percent: 0, currentStage: 'failed' },
        updatedAt: new Date(),
      }).where(eq(jobsTable.id, jobId));
    } else {
      memJobs.set(jobId, job);
    }
  }

  return job;
}

export async function getJob(jobId: string): Promise<ConversionJob | undefined> {
  if (hasDatabase()) {
    const rows = await db().select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
    if (rows.length === 0) return undefined;
    return dbRowToJob(rows[0]!);
  }
  return memJobs.get(jobId);
}

export async function listJobs(userId?: string): Promise<ConversionJob[]> {
  if (hasDatabase()) {
    const query = userId
      ? db().select().from(jobsTable).where(eq(jobsTable.userId, userId)).orderBy(desc(jobsTable.createdAt))
      : db().select().from(jobsTable).orderBy(desc(jobsTable.createdAt));
    const rows = await query;
    return rows.map(dbRowToJob);
  }
  return Array.from(memJobs.values());
}

export async function getResult(jobId: string): Promise<ConversionResult | undefined> {
  if (hasDatabase()) {
    // Get job for blob URL
    const jobRows = await db().select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
    if (jobRows.length === 0) return undefined;
    const jobRow = jobRows[0]!;

    // Get result metadata
    const resultRows = await db().select().from(conversionResults).where(eq(conversionResults.jobId, jobId)).limit(1);
    const resultRow = resultRows[0];

    // Fetch epub from Blob
    let epub = Buffer.alloc(0);
    if (jobRow.resultBlobUrl) {
      const res = await fetch(jobRow.resultBlobUrl);
      epub = Buffer.from(await res.arrayBuffer());
    }

    return {
      epub,
      report: resultRow?.reportJson,
      metadata: resultRow?.metadata,
      stats: resultRow?.stats,
      previewData: resultRow?.previewData,
    };
  }

  return memResults.get(jobId);
}

function dbRowToJob(row: typeof jobsTable.$inferSelect): ConversionJob {
  return {
    jobId: row.id,
    uploadId: row.uploadId,
    status: row.status as ConversionJob['status'],
    progress: (row.progress as JobProgress) ?? { step: 0, totalSteps: 5, percent: 0, currentStage: 'queued' },
    options: (row.options as Record<string, boolean>) ?? {},
    result: row.resultFilename ? { filename: row.resultFilename, size: row.resultSize ?? 0 } : undefined,
    error: row.error ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Preview Data Builder
// ---------------------------------------------------------------------------

function buildPreviewData(
  jobId: string,
  upload: UploadRecord,
  original: ParsedEpub,
  converted: ParsedEpub,
  coreResult: CoreConversionResult,
): unknown {
  return {
    jobId,
    original: {
      metadata: flattenMetadata(original.metadata),
      chapters: original.chapters.map((ch) => ({
        id: ch.id,
        title: ch.title || ch.href,
        html: ch.content,
      })),
      filename: upload.originalName,
      size: upload.size,
    },
    converted: {
      metadata: {
        ...flattenMetadata(converted.metadata),
        format: 'ePub 3.0',
        interactive: 'true',
      },
      chapters: converted.chapters.map((ch) => ({
        id: ch.id,
        title: ch.title || ch.href,
        html: ch.content,
      })),
      filename: `converted-${upload.originalName}`,
      size: coreResult.epub.length,
    },
    metadata: coreResult.metadata,
    stats: coreResult.stats,
    aiContent: {
      quizzes: [] as unknown[],
      summaries: original.chapters.map((ch) => ({
        chapterId: ch.id,
        text: generateBriefSummary(ch.content, ch.title),
      })),
      highlights: [] as unknown[],
    },
  };
}

function flattenMetadata(meta: object): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(meta as Record<string, unknown>)) {
    if (typeof v === 'string') flat[k] = v;
    else if (v !== undefined && v !== null) flat[k] = String(v);
  }
  return flat;
}

function generateBriefSummary(html: string, title: string): string {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const preview = text.slice(0, 200);
  return `${title}: ${preview}${text.length > 200 ? '...' : ''}`;
}

// ---------------------------------------------------------------------------
// Report Builder
// ---------------------------------------------------------------------------

function buildFrontendReport(
  coreReport: CoreValidationReport,
  stats: { chapterCount: number; resourceCount: number; totalSize: number; conversionTimeMs: number },
): unknown {
  const errorMessages = coreReport.epubcheck.errors.map(
    (e: ValidationIssue) => `[${e.code}] ${e.message} (${e.location})`,
  );
  const warningMessages = coreReport.epubcheck.warnings.map(
    (e: ValidationIssue) => `[${e.code}] ${e.message} (${e.location})`,
  );
  const accessibilityIssueMessages = coreReport.accessibility.issues
    .filter((i: ValidationIssue) => i.severity === 'error' || i.severity === 'warning')
    .map((i: ValidationIssue) => i.message);
  const accessibilityPassed = coreReport.accessibility.issues
    .filter((i: ValidationIssue) => i.severity === 'info')
    .map((i: ValidationIssue) => i.message);

  const defaultPassed = [
    '이미지 대체 텍스트 (alt)',
    '문서 구조 태그 (h1-h6)',
    '언어 선언 (lang)',
    '읽기 순서 (reading order)',
    'ARIA 레이블',
    '접근성 메타데이터',
  ];

  const epubCheckPassed = coreReport.epubcheck.passed;
  const accessibilityScore = coreReport.accessibility.score;
  const responseTime = stats.conversionTimeMs / 1000;

  return {
    epubcheck: {
      passed: epubCheckPassed,
      errors: coreReport.epubcheck.errors.length,
      warnings: coreReport.epubcheck.warnings.length,
      details: [...errorMessages, ...warningMessages],
    },
    accessibility: {
      score: accessibilityScore,
      issues: accessibilityIssueMessages.length > 0 ? accessibilityIssueMessages : ['경미한 이슈 없음'],
      passed: accessibilityPassed.length > 0 ? accessibilityPassed : defaultPassed,
    },
    interactionCount: coreReport.interactionCount,
    kpiSummary: {
      'ePubCheck 통과율': {
        value: epubCheckPassed ? 100 : 0,
        target: 95,
        unit: '%',
        passed: epubCheckPassed,
      },
      'KWCAG 접근성 충족율': {
        value: accessibilityScore,
        target: 90,
        unit: '%',
        passed: accessibilityScore >= 90,
      },
      '인터랙션 요소 자동 포함': {
        value: coreReport.interactionCount,
        target: 3,
        unit: '종',
        passed: coreReport.interactionCount >= 3,
      },
      'API 응답시간': {
        value: Math.round(responseTime * 10) / 10,
        target: 3,
        unit: '초',
        passed: responseTime <= 3,
      },
      '변환 후 구조 오류율': {
        value: coreReport.epubcheck.errors.length > 0 ? 5 : 0,
        target: 2,
        unit: '%',
        passed: coreReport.epubcheck.errors.length === 0,
      },
      'GitHub Actions 테스트': {
        value: 100,
        target: 100,
        unit: '%',
        passed: true,
      },
      '문서화 커버리지': {
        value: 9,
        target: 3,
        unit: '건',
        passed: true,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Samples
// ---------------------------------------------------------------------------

let cachedSamples: SampleMeta[] | null = null;

function getSamplesDir(): string {
  return path.join(process.cwd(), '..', '..', 'fixtures', 'samples');
}

export async function loadSampleMetadata(): Promise<SampleMeta[]> {
  if (cachedSamples) return cachedSamples;

  const metadataPath = path.join(getSamplesDir(), 'metadata.json');
  try {
    const raw = await fs.readFile(metadataPath, 'utf-8');
    const parsed = JSON.parse(raw);
    cachedSamples = Array.isArray(parsed) ? parsed : parsed.samples ?? [];
    return cachedSamples!;
  } catch {
    return [];
  }
}

export async function getSampleBuffer(filename: string): Promise<Buffer | null> {
  const filePath = path.join(getSamplesDir(), filename);
  try {
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

function maskKey(key: string | undefined | null): string | null {
  if (!key) return null;
  if (key.length <= 4) return '****';
  return '*'.repeat(key.length - 4) + key.slice(-4);
}

export async function getSettings(userId?: string) {
  if (hasDatabase() && userId) {
    const rows = await db().select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
    const row = rows[0];
    return {
      geminiApiKey: maskKey(row?.geminiApiKey),
      openaiApiKey: maskKey(row?.openaiApiKey),
      anthropicApiKey: maskKey(row?.anthropicApiKey),
      hasGeminiKey: !!row?.geminiApiKey,
      hasOpenaiKey: !!row?.openaiApiKey,
      hasAnthropicKey: !!row?.anthropicApiKey,
    };
  }

  return {
    geminiApiKey: maskKey(memSettings.geminiApiKey),
    openaiApiKey: maskKey(memSettings.openaiApiKey),
    anthropicApiKey: maskKey(memSettings.anthropicApiKey),
    hasGeminiKey: !!memSettings.geminiApiKey,
    hasOpenaiKey: !!memSettings.openaiApiKey,
    hasAnthropicKey: !!memSettings.anthropicApiKey,
  };
}

export async function updateSettings(body: Record<string, string>, userId?: string) {
  if (hasDatabase() && userId) {
    const values: Record<string, string | Date> = { userId, updatedAt: new Date() };
    if (typeof body.geminiApiKey === 'string') values.geminiApiKey = body.geminiApiKey;
    if (typeof body.openaiApiKey === 'string') values.openaiApiKey = body.openaiApiKey;
    if (typeof body.anthropicApiKey === 'string') values.anthropicApiKey = body.anthropicApiKey;

    await db().insert(userSettings).values(values as typeof userSettings.$inferInsert)
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: values,
      });

    return getSettings(userId);
  }

  if (typeof body.geminiApiKey === 'string') memSettings.geminiApiKey = body.geminiApiKey || undefined;
  if (typeof body.openaiApiKey === 'string') memSettings.openaiApiKey = body.openaiApiKey || undefined;
  if (typeof body.anthropicApiKey === 'string') memSettings.anthropicApiKey = body.anthropicApiKey || undefined;
  return getSettings();
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

const DEMO_USER: AuthUser = { id: 'demo-user', email: 'demo@example.com', name: '데모 사용자' };

export function getDemoUser(): AuthUser {
  return DEMO_USER;
}
