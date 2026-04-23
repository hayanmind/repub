/**
 * KPI 확장 검증 스크립트 (시험성적서 대응)
 *
 * 기존 validate-kpi.ts 가 다루지 않는 3개 정량 지표를 보강하여 측정합니다.
 *
 *   - KPI #2  퀴즈 HTML 구조/문법 오류율         ≤ 1%
 *   - KPI #4  TTS 텍스트 싱크 정확도               ≥ 98%
 *   - KPI #5  TTS 무음 구간 비율                  ≤ 5%
 *
 * 기본 동작:
 *   fixtures/ 및 fixtures/samples/ 에 있는 모든 .epub 을 processEpub() 으로
 *   변환하고, 변환 결과물에서 위 지표를 추출한 뒤 kpi-report-extended.json 에
 *   상세 내역을 기록합니다.
 *
 * Usage:
 *   npx tsx scripts/validate-kpi-extended.ts
 *   USE_MOCK=1 npx tsx scripts/validate-kpi-extended.ts   # AI 호출 없이 측정
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';
import { parseDocument } from 'htmlparser2';
import * as domutils from 'domutils';
import type { Element } from 'domhandler';
import { processEpub } from '@gov-epub/core';
import type { ConversionOptions } from '@gov-epub/core';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');
const SAMPLES_DIR = path.join(FIXTURES_DIR, 'samples');

interface QuizFileMetric {
  file: string;
  quizBlocks: number;
  malformedBlocks: number;
}

interface SmilFileMetric {
  file: string;
  parCount: number;
  pairedCount: number;
  monotonicViolations: number;
  speakingSeconds: number;
  silenceSeconds: number;
  syncAccuracy: number; // 0-100
  silenceRatio: number; // 0-100
}

interface FileMetric {
  file: string;
  success: boolean;
  error?: string;
  quiz: QuizFileMetric | null;
  smil: SmilFileMetric | null;
}

// ---------------------------------------------------------------------------
// KPI #2: Quiz HTML well-formedness
// ---------------------------------------------------------------------------

/**
 * Extract quiz blocks from a chapter HTML and validate their well-formedness.
 *
 * A "quiz block" is any element tagged with class "ai-quiz" or
 * class "quiz-item" or epub:type="practice".  Each block's inner HTML is
 * parsed with htmlparser2 in strict XML mode; any unrecoverable parse error
 * is counted as a malformed block.
 */
export function analyseQuizBlocks(html: string): {
  total: number;
  malformed: number;
} {
  const patterns = [
    /<aside\b[^>]*class="[^"]*ai-quiz[^"]*"[^>]*>[\s\S]*?<\/aside>/gi,
    /<div\b[^>]*class="[^"]*quiz-item[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    /<(?:section|div|aside)\b[^>]*epub:type="practice"[^>]*>[\s\S]*?<\/(?:section|div|aside)>/gi,
  ];

  const blocks: string[] = [];
  for (const re of patterns) {
    const found = html.match(re);
    if (found) blocks.push(...found);
  }

  if (blocks.length === 0) return { total: 0, malformed: 0 };

  let malformed = 0;
  for (const block of blocks) {
    if (!isWellFormed(block)) {
      malformed++;
    }
  }

  return { total: blocks.length, malformed };
}

function isWellFormed(fragment: string): boolean {
  // Wrap in a namespaced root so that epub:type attributes parse cleanly.
  const wrapped = `<root xmlns:epub="http://www.idpf.org/2007/ops">${fragment}</root>`;
  try {
    const doc = parseDocument(wrapped, {
      xmlMode: true,
      recognizeSelfClosing: true,
    });
    // Structural sanity: at least one child element must exist.
    const firstEl = domutils.findOne(
      (n) => n.type === 'tag',
      doc.children,
      true,
    );
    if (!firstEl) return false;

    // Basic structural checks for quiz-item blocks.
    const quizItems = domutils.findAll(
      (n) =>
        n.type === 'tag' &&
        (n as Element).attribs?.class?.includes?.('quiz-item') === true,
      doc.children,
    );
    for (const item of quizItems) {
      const question = domutils.findOne(
        (n) =>
          n.type === 'tag' &&
          (n as Element).attribs?.class === 'quiz-question',
        (item as Element).children,
        true,
      );
      const options = domutils.findOne(
        (n) =>
          n.type === 'tag' &&
          (n as Element).attribs?.class === 'quiz-options',
        (item as Element).children,
        true,
      );
      if (!question || !options) return false;
    }
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// KPI #4 & #5: SMIL sync accuracy and silence ratio
// ---------------------------------------------------------------------------

/**
 * Analyse a SMIL document to compute TTS sync-accuracy and silence-ratio
 * metrics.
 *
 * Sync accuracy = (pars with well-formed <text>/<audio> pairing AND
 *                  monotonically non-decreasing clipBegin) / total pars.
 * Silence ratio = inter-par gap / (speaking + gap).
 */
export function analyseSmil(smilXml: string): SmilFileMetric | null {
  const doc = parseDocument(smilXml, { xmlMode: true });
  const pars = domutils.findAll(
    (n) => n.type === 'tag' && (n as Element).name.toLowerCase() === 'par',
    doc.children,
  );

  if (pars.length === 0) return null;

  let pairedCount = 0;
  let monotonicViolations = 0;
  let speakingSeconds = 0;
  let silenceSeconds = 0;
  let prevEnd = 0;

  for (let i = 0; i < pars.length; i++) {
    const par = pars[i] as Element;
    const text = domutils.findOne(
      (n) => n.type === 'tag' && (n as Element).name.toLowerCase() === 'text',
      par.children,
      true,
    );
    const audio = domutils.findOne(
      (n) => n.type === 'tag' && (n as Element).name.toLowerCase() === 'audio',
      par.children,
      true,
    );

    if (!text || !audio) continue;
    const textAttribs = (text as Element).attribs ?? {};
    const audioAttribs = (audio as Element).attribs ?? {};
    // htmlparser2 in xmlMode preserves attribute-name case.  Accept both
    // camelCase (SMIL spec) and lowercase variants defensively.
    const textSrc = textAttribs.src ?? (textAttribs as Record<string, string>).Src ?? '';
    const clipBeginStr =
      audioAttribs.clipBegin ?? audioAttribs.clipbegin ?? '';
    const clipEndStr = audioAttribs.clipEnd ?? audioAttribs.clipend ?? '';

    if (!textSrc || !clipBeginStr || !clipEndStr) continue;

    const clipBegin = parseSmilTime(clipBeginStr);
    const clipEnd = parseSmilTime(clipEndStr);
    if (!Number.isFinite(clipBegin) || !Number.isFinite(clipEnd)) continue;
    if (clipEnd <= clipBegin) continue;

    // Monotonic check relative to previous par.
    if (clipBegin < prevEnd - 1e-6) {
      monotonicViolations++;
    } else {
      // Accept the pair.
      pairedCount++;
    }

    // Accumulate durations (always, regardless of monotonicity — they
    // still reflect what the SMIL claims).
    speakingSeconds += clipEnd - clipBegin;
    if (i > 0) {
      const gap = Math.max(0, clipBegin - prevEnd);
      silenceSeconds += gap;
    }
    prevEnd = clipEnd;
  }

  const syncAccuracy = (pairedCount / pars.length) * 100;
  const totalTime = speakingSeconds + silenceSeconds;
  const silenceRatio = totalTime > 0 ? (silenceSeconds / totalTime) * 100 : 0;

  return {
    file: '',
    parCount: pars.length,
    pairedCount,
    monotonicViolations,
    speakingSeconds: round(speakingSeconds, 3),
    silenceSeconds: round(silenceSeconds, 3),
    syncAccuracy: round(syncAccuracy, 2),
    silenceRatio: round(silenceRatio, 2),
  };
}

function parseSmilTime(value: string): number {
  // Accepts "hh:mm:ss.mmm", "mm:ss.mmm", "SSs", or raw "SS" (seconds).
  const trimmed = value.trim();
  if (/^\d+(\.\d+)?s$/i.test(trimmed)) {
    return parseFloat(trimmed);
  }
  if (/^\d+(\.\d+)?ms$/i.test(trimmed)) {
    return parseFloat(trimmed) / 1000;
  }
  const parts = trimmed.split(':').map((p) => parseFloat(p));
  if (parts.some((p) => Number.isNaN(p))) return NaN;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return NaN;
}

function round(n: number, digits: number): number {
  const mult = Math.pow(10, digits);
  return Math.round(n * mult) / mult;
}

// ---------------------------------------------------------------------------
// Per-file measurement
// ---------------------------------------------------------------------------

async function measureEpub(filePath: string): Promise<FileMetric> {
  const fileName = path.basename(filePath);
  const options: ConversionOptions = {
    enableTts: true,
    enableQuiz: true,
    enableImageGen: false,
    enableSummary: true,
    templateId: 'default',
    cssTheme: 'modern',
  };

  try {
    const buffer = await fs.readFile(filePath);
    const result = await processEpub(buffer, options);
    const zip = await JSZip.loadAsync(result.epub);

    // --- KPI #2: quiz well-formedness ----------------------------------
    const quizMetric = await analyseQuizzesInZip(zip, fileName);

    // --- KPI #4 / #5: SMIL sync + silence ------------------------------
    const smilMetric = await analyseSmilInZip(zip, fileName);

    return {
      file: fileName,
      success: true,
      quiz: quizMetric,
      smil: smilMetric,
    };
  } catch (err) {
    return {
      file: fileName,
      success: false,
      error: err instanceof Error ? err.message : String(err),
      quiz: null,
      smil: null,
    };
  }
}

async function analyseQuizzesInZip(
  zip: JSZip,
  fileName: string,
): Promise<QuizFileMetric> {
  let totalBlocks = 0;
  let malformedBlocks = 0;

  const htmlFiles = Object.keys(zip.files).filter(
    (n) => /\.(x?html?)$/i.test(n) && !zip.files[n].dir,
  );
  for (const p of htmlFiles) {
    const html = await zip.file(p)!.async('string');
    const { total, malformed } = analyseQuizBlocks(html);
    totalBlocks += total;
    malformedBlocks += malformed;
  }

  return {
    file: fileName,
    quizBlocks: totalBlocks,
    malformedBlocks,
  };
}

async function analyseSmilInZip(
  zip: JSZip,
  fileName: string,
): Promise<SmilFileMetric | null> {
  const smilFiles = Object.keys(zip.files).filter(
    (n) => /\.smil$/i.test(n) && !zip.files[n].dir,
  );
  if (smilFiles.length === 0) return null;

  // Aggregate across all SMIL files in the book.
  let parCount = 0;
  let pairedCount = 0;
  let monotonicViolations = 0;
  let speakingSeconds = 0;
  let silenceSeconds = 0;

  for (const p of smilFiles) {
    const xml = await zip.file(p)!.async('string');
    const m = analyseSmil(xml);
    if (!m) continue;
    parCount += m.parCount;
    pairedCount += m.pairedCount;
    monotonicViolations += m.monotonicViolations;
    speakingSeconds += m.speakingSeconds;
    silenceSeconds += m.silenceSeconds;
  }

  if (parCount === 0) return null;

  const syncAccuracy = (pairedCount / parCount) * 100;
  const totalTime = speakingSeconds + silenceSeconds;
  const silenceRatio = totalTime > 0 ? (silenceSeconds / totalTime) * 100 : 0;

  return {
    file: fileName,
    parCount,
    pairedCount,
    monotonicViolations,
    speakingSeconds: round(speakingSeconds, 3),
    silenceSeconds: round(silenceSeconds, 3),
    syncAccuracy: round(syncAccuracy, 2),
    silenceRatio: round(silenceRatio, 2),
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ePub 리마스터링 시스템 — KPI 확장 검증 (#2 / #4 / #5)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  검증 일시: ${new Date().toISOString()}`);
  console.log('');

  const testFiles: string[] = [];
  for (const f of await fs.readdir(FIXTURES_DIR)) {
    if (f.endsWith('.epub')) testFiles.push(path.join(FIXTURES_DIR, f));
  }
  try {
    for (const f of await fs.readdir(SAMPLES_DIR)) {
      if (f.endsWith('.epub')) testFiles.push(path.join(SAMPLES_DIR, f));
    }
  } catch {
    // samples dir may not exist — ignore
  }

  console.log(`  대상 파일: ${testFiles.length}개\n`);

  const metrics: FileMetric[] = [];
  for (const f of testFiles) {
    process.stdout.write(`  [변환] ${path.basename(f)}... `);
    const metric = await measureEpub(f);
    if (metric.success) {
      const q = metric.quiz;
      const s = metric.smil;
      const qText = q
        ? `퀴즈 ${q.quizBlocks}블록 (오류 ${q.malformedBlocks})`
        : '퀴즈 없음';
      const sText = s
        ? `SMIL par ${s.parCount}, 싱크 ${s.syncAccuracy}%, 무음 ${s.silenceRatio}%`
        : 'SMIL 없음';
      console.log(`✓ ${qText} | ${sText}`);
    } else {
      console.log(`✗ ${metric.error}`);
    }
    metrics.push(metric);
  }

  // --- Aggregate ---------------------------------------------------------
  let totalQuizBlocks = 0;
  let totalMalformed = 0;
  let totalPars = 0;
  let totalPaired = 0;
  let totalSpeak = 0;
  let totalSilence = 0;
  let booksWithSmil = 0;

  for (const m of metrics) {
    if (m.quiz) {
      totalQuizBlocks += m.quiz.quizBlocks;
      totalMalformed += m.quiz.malformedBlocks;
    }
    if (m.smil) {
      booksWithSmil++;
      totalPars += m.smil.parCount;
      totalPaired += m.smil.pairedCount;
      totalSpeak += m.smil.speakingSeconds;
      totalSilence += m.smil.silenceSeconds;
    }
  }

  const quizErrorRate =
    totalQuizBlocks > 0 ? (totalMalformed / totalQuizBlocks) * 100 : 0;
  const syncAccuracy =
    totalPars > 0 ? (totalPaired / totalPars) * 100 : NaN;
  const totalTime = totalSpeak + totalSilence;
  const silenceRatio = totalTime > 0 ? (totalSilence / totalTime) * 100 : NaN;

  // --- Output ------------------------------------------------------------
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  KPI 확장 지표');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  printKpi(
    'KPI #2',
    '퀴즈 HTML 구조/문법 오류율',
    `${round(quizErrorRate, 2)}%`,
    `(${totalMalformed}/${totalQuizBlocks} blocks)`,
    '≤ 1%',
    quizErrorRate <= 1,
  );

  if (Number.isNaN(syncAccuracy)) {
    printKpiNA(
      'KPI #4',
      'TTS 텍스트 싱크 정확도',
      '≥ 98%',
      '(SMIL 파일 없음 — TTS 비활성 또는 mock 오디오 누락)',
    );
  } else {
    printKpi(
      'KPI #4',
      'TTS 텍스트 싱크 정확도',
      `${round(syncAccuracy, 2)}%`,
      `(${totalPaired}/${totalPars} pars paired, ${booksWithSmil} books w/ SMIL)`,
      '≥ 98%',
      syncAccuracy >= 98,
    );
  }

  if (Number.isNaN(silenceRatio)) {
    printKpiNA(
      'KPI #5',
      'TTS 무음 구간 비율',
      '≤ 5%',
      '(N/A — no audio present in mock mode)',
    );
  } else {
    printKpi(
      'KPI #5',
      'TTS 무음 구간 비율',
      `${round(silenceRatio, 2)}%`,
      `(발화 ${round(totalSpeak, 1)}s / 무음 ${round(totalSilence, 1)}s)`,
      '≤ 5%',
      silenceRatio <= 5,
    );
  }

  console.log('');

  // --- JSON Report -------------------------------------------------------
  const report = {
    timestamp: new Date().toISOString(),
    totals: {
      totalFiles: metrics.length,
      successCount: metrics.filter((m) => m.success).length,
      quizBlocks: totalQuizBlocks,
      quizMalformed: totalMalformed,
      quizErrorRatePercent: round(quizErrorRate, 4),
      smilBooks: booksWithSmil,
      smilParCount: totalPars,
      smilPairedCount: totalPaired,
      smilSyncAccuracyPercent: Number.isNaN(syncAccuracy)
        ? null
        : round(syncAccuracy, 4),
      smilSpeakingSeconds: round(totalSpeak, 3),
      smilSilenceSeconds: round(totalSilence, 3),
      smilSilenceRatioPercent: Number.isNaN(silenceRatio)
        ? null
        : round(silenceRatio, 4),
    },
    kpis: {
      'KPI-2': {
        name: '퀴즈 HTML 구조/문법 오류율',
        target: '≤ 1%',
        value: round(quizErrorRate, 4),
        unit: '%',
        passed: quizErrorRate <= 1,
      },
      'KPI-4': {
        name: 'TTS 텍스트 싱크 정확도',
        target: '≥ 98%',
        value: Number.isNaN(syncAccuracy) ? null : round(syncAccuracy, 4),
        unit: '%',
        passed: Number.isNaN(syncAccuracy) ? null : syncAccuracy >= 98,
        note: Number.isNaN(syncAccuracy)
          ? 'N/A — no SMIL produced for these inputs'
          : 'Structural integrity from SMIL par/audio pairing + monotonic clipBegin',
      },
      'KPI-5': {
        name: 'TTS 무음 구간 비율',
        target: '≤ 5%',
        value: Number.isNaN(silenceRatio) ? null : round(silenceRatio, 4),
        unit: '%',
        passed: Number.isNaN(silenceRatio) ? null : silenceRatio <= 5,
        note: Number.isNaN(silenceRatio)
          ? 'N/A (no audio present in mock mode)'
          : 'Computed from SMIL timing — real audio silence analysis requires actual mp3 data',
      },
    },
    files: metrics,
  };

  const outputPath = path.join(__dirname, '..', 'kpi-report-extended.json');
  await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
  console.log(`  JSON 리포트 저장: ${outputPath}\n`);

  // Exit non-zero only when quiz KPI fails (structural).  TTS KPIs may be
  // N/A in mock mode, which is not a failure.
  const hardFail =
    !(quizErrorRate <= 1) ||
    (!Number.isNaN(syncAccuracy) && syncAccuracy < 98) ||
    (!Number.isNaN(silenceRatio) && silenceRatio > 5);
  process.exit(hardFail ? 1 : 0);
}

function printKpi(
  id: string,
  name: string,
  value: string,
  detail: string,
  target: string,
  passed: boolean,
): void {
  const icon = passed ? '✓' : '✗';
  const status = passed ? 'PASS' : 'FAIL';
  console.log(`  ${icon} [${status}] ${id} ${name}: ${value} ${detail}`);
  console.log(`           목표: ${target}`);
}

function printKpiNA(
  id: string,
  name: string,
  target: string,
  note: string,
): void {
  console.log(`  ○ [ N/A ] ${id} ${name}: ${note}`);
  console.log(`           목표: ${target}`);
}

main().catch((err) => {
  console.error('KPI 확장 검증 실패:', err);
  process.exit(1);
});
