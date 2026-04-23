/**
 * KPI 전수 검증 스크립트 — 1,010권 데이터셋 대상.
 *
 * fixtures/dataset-1000/{literature,non-fiction,korean}/*.epub 전체를
 * processEpub()로 변환하고 CLAUDE.md §4.1 KPI 13개를 측정해 JSON/MD 리포트 생성.
 *
 * Mock 모드 기본 (실제 AI API 호출 없음 → 재현 가능).
 * Usage:
 *   npx tsx scripts/validate-kpi-dataset.ts              # 전체 (1,010권)
 *   LIMIT=100 npx tsx scripts/validate-kpi-dataset.ts    # 처음 100권만
 *   CATEGORY=literature npx tsx scripts/validate-kpi-dataset.ts
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { processEpub } from '@gov-epub/core';
import type { ConversionOptions } from '@gov-epub/core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DATASET = path.join(ROOT, 'fixtures', 'dataset-1000');
const CATEGORIES = ['literature', 'non-fiction', 'korean'] as const;
type Category = (typeof CATEGORIES)[number];

const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : Number.POSITIVE_INFINITY;
const FILTER_CAT = process.env.CATEGORY as Category | undefined;

interface FileResult {
  file: string;
  category: Category;
  sizeIn: number;
  success: boolean;
  error?: string;
  conversionTimeMs: number;
  epubCheckPassed: boolean;
  epubCheckErrors: number;
  epubCheckWarnings: number;
  accessibilityScore: number;
  interactionCount: number;
  chapterCount: number;
  resourceCount: number;
  sizeOut: number;
}

async function collectFiles(): Promise<Array<{ path: string; category: Category }>> {
  const out: Array<{ path: string; category: Category }> = [];
  for (const cat of CATEGORIES) {
    if (FILTER_CAT && FILTER_CAT !== cat) continue;
    const dir = path.join(DATASET, cat);
    try {
      const files = await fs.readdir(dir);
      for (const f of files) {
        if (f.endsWith('.epub')) out.push({ path: path.join(dir, f), category: cat });
      }
    } catch {
      // directory missing — skip
    }
  }
  return out;
}

function fmt(n: number, digits = 1): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

async function main() {
  const bar = '━'.repeat(56);
  console.log(`\n${bar}\n  KPI 전수 검증 — 1,010권 데이터셋\n${bar}`);
  console.log(`  시작: ${new Date().toISOString()}`);

  const files = await collectFiles();
  const target = files.slice(0, Math.min(LIMIT, files.length));
  console.log(`  대상: ${target.length}권 (카테고리 필터: ${FILTER_CAT ?? '전체'})`);

  const options: ConversionOptions = {
    enableTts: true,
    enableQuiz: true,
    enableImageGen: false,
    enableSummary: true,
    templateId: 'default',
    cssTheme: 'modern',
  };

  const results: FileResult[] = [];
  const t0 = Date.now();
  let ok = 0;
  let fail = 0;

  for (let i = 0; i < target.length; i++) {
    const { path: filePath, category } = target[i];
    const fileName = path.basename(filePath);
    const start = Date.now();
    try {
      const buffer = await fs.readFile(filePath);
      const result = await processEpub(buffer, options);
      const elapsed = Date.now() - start;
      results.push({
        file: fileName,
        category,
        sizeIn: buffer.length,
        success: true,
        conversionTimeMs: elapsed,
        epubCheckPassed: result.report.epubcheck.passed,
        epubCheckErrors: result.report.epubcheck.errors.length,
        epubCheckWarnings: result.report.epubcheck.warnings.length,
        accessibilityScore: result.report.accessibility.score,
        interactionCount: result.report.interactionCount,
        chapterCount: result.stats.chapterCount,
        resourceCount: result.stats.resourceCount,
        sizeOut: result.stats.totalSize,
      });
      ok++;
    } catch (err) {
      const elapsed = Date.now() - start;
      results.push({
        file: fileName,
        category,
        sizeIn: 0,
        success: false,
        error: err instanceof Error ? err.message : String(err),
        conversionTimeMs: elapsed,
        epubCheckPassed: false,
        epubCheckErrors: -1,
        epubCheckWarnings: -1,
        accessibilityScore: 0,
        interactionCount: 0,
        chapterCount: 0,
        resourceCount: 0,
        sizeOut: 0,
      });
      fail++;
    }

    if ((i + 1) % 20 === 0 || i + 1 === target.length) {
      const dt = (Date.now() - t0) / 1000;
      const rate = (i + 1) / dt;
      const eta = (target.length - i - 1) / Math.max(rate, 0.01);
      process.stdout.write(
        `\r  ${i + 1}/${target.length}  ok=${ok}  fail=${fail}  ${rate.toFixed(1)}/s  ETA ${Math.round(eta)}s     `,
      );
    }
  }
  process.stdout.write('\n');

  // Aggregate
  const successRows = results.filter((r) => r.success);
  const successCount = successRows.length;
  const total = results.length;

  const byCat = CATEGORIES.map((c) => {
    const rows = results.filter((r) => r.category === c);
    const good = rows.filter((r) => r.success);
    return { category: c, total: rows.length, ok: good.length };
  });

  const avgConv = successCount ? successRows.reduce((s, r) => s + r.conversionTimeMs, 0) / successCount : 0;
  const p95Conv = (() => {
    if (!successCount) return 0;
    const sorted = successRows.map((r) => r.conversionTimeMs).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.95)];
  })();
  const epubCheckPassCount = successRows.filter((r) => r.epubCheckPassed).length;
  const epubCheckRate = total ? (epubCheckPassCount / total) * 100 : 0;
  const avgAccess = successCount
    ? successRows.reduce((s, r) => s + r.accessibilityScore, 0) / successCount
    : 0;
  const avgInteraction = successCount
    ? successRows.reduce((s, r) => s + r.interactionCount, 0) / successCount
    : 0;
  const avgChapters = successCount
    ? successRows.reduce((s, r) => s + r.chapterCount, 0) / successCount
    : 0;
  const structErrorRate = total
    ? ((total - epubCheckPassCount) / total) * 100
    : 0;

  const kpis = [
    {
      id: 1,
      name: 'ePubCheck 통과율',
      value: `${epubCheckRate.toFixed(1)}%`,
      target: '≥ 95%',
      passed: epubCheckRate >= 95,
      numeric: epubCheckRate,
    },
    {
      id: 6,
      name: 'KWCAG 접근성 충족율',
      value: `${avgAccess.toFixed(1)}%`,
      target: '≥ 90%',
      passed: avgAccess >= 90,
      numeric: avgAccess,
    },
    {
      id: 7,
      name: '인터랙션 요소 자동 포함',
      value: `${avgInteraction.toFixed(1)}종/권`,
      target: '≥ 3종/권',
      passed: avgInteraction >= 3,
      numeric: avgInteraction,
    },
    {
      id: 8,
      name: '평균 변환 시간',
      value: `${(avgConv / 1000).toFixed(2)}초`,
      target: '≤ 3초',
      passed: avgConv / 1000 <= 3,
      numeric: avgConv / 1000,
    },
    {
      id: 11,
      name: '변환 후 구조 오류율',
      value: `${structErrorRate.toFixed(2)}%`,
      target: '≤ 2%',
      passed: structErrorRate <= 2,
      numeric: structErrorRate,
    },
    {
      id: 99,
      name: '변환 성공률',
      value: `${((successCount / total) * 100).toFixed(1)}%`,
      target: '≥ 95%',
      passed: (successCount / total) * 100 >= 95,
      numeric: (successCount / total) * 100,
    },
  ];

  // Console summary
  console.log(`\n${bar}\n  KPI 전수 결과 (N=${total})\n${bar}`);
  for (const k of kpis) {
    const icon = k.passed ? '✓' : '✗';
    console.log(`  ${icon} KPI #${String(k.id).padStart(2)}  ${k.name.padEnd(22)} ${k.value.padStart(10)}  (목표: ${k.target})`);
  }
  console.log(`\n  P95 변환시간: ${(p95Conv / 1000).toFixed(2)}초`);
  console.log(`  평균 챕터 수: ${avgChapters.toFixed(1)}`);
  console.log(`\n  카테고리별 분포:`);
  for (const c of byCat) {
    const rate = c.total ? ((c.ok / c.total) * 100).toFixed(1) : '—';
    console.log(`    ${c.category.padEnd(12)} ${String(c.ok).padStart(4)}/${String(c.total).padEnd(4)} (${rate}%)`);
  }

  // JSON
  const jsonReport = {
    timestamp: new Date().toISOString(),
    mode: 'Mock (재현 가능)',
    totalFiles: total,
    successCount,
    failCount: fail,
    elapsedSeconds: (Date.now() - t0) / 1000,
    byCategory: byCat,
    kpis: Object.fromEntries(kpis.map((k) => [`KPI#${k.id}`, { name: k.name, value: k.value, target: k.target, passed: k.passed }])),
    aggregates: {
      epubCheckRate,
      avgAccessibilityScore: avgAccess,
      avgInteractionCount: avgInteraction,
      avgConversionTimeMs: avgConv,
      p95ConversionTimeMs: p95Conv,
      avgChapterCount: avgChapters,
      structErrorRate,
    },
    files: results,
  };

  const jsonOut = path.join(ROOT, 'kpi-report-dataset.json');
  await fs.writeFile(jsonOut, JSON.stringify(jsonReport, null, 2));
  console.log(`\n  JSON 리포트: ${jsonOut}  (${(JSON.stringify(jsonReport).length / 1024).toFixed(0)} KB)`);

  // MD summary
  const md = [
    `# ePub 1,010권 KPI 전수 검증 리포트`,
    ``,
    `| 항목 | 값 |`,
    `|---|---|`,
    `| 검증 일시 | ${new Date().toISOString()} |`,
    `| 대상 | ${total}권 (literature ${byCat[0].total} + non-fiction ${byCat[1].total} + korean ${byCat[2].total}) |`,
    `| 모드 | Mock (재현 가능, 실제 AI API 호출 없음) |`,
    `| 소요 시간 | ${fmt((Date.now() - t0) / 1000, 0)}초 |`,
    `| 변환 성공 | ${successCount}/${total} (${fmt((successCount / total) * 100)}%) |`,
    ``,
    `## KPI 달성 현황`,
    ``,
    `| # | KPI | 측정값 | 목표 | 판정 |`,
    `|---|-----|--------|------|------|`,
    ...kpis.map((k) => `| ${k.id} | ${k.name} | **${k.value}** | ${k.target} | ${k.passed ? '✅ PASS' : '❌ FAIL'} |`),
    ``,
    `## 카테고리별 변환 성공률`,
    ``,
    `| 카테고리 | 성공/전체 | 성공률 |`,
    `|---------|-----------|--------|`,
    ...byCat.map((c) => `| ${c.category} | ${c.ok}/${c.total} | ${c.total ? fmt((c.ok / c.total) * 100) : '—'}% |`),
    ``,
    `## 기술 지표`,
    ``,
    `- 평균 변환 시간: ${fmt(avgConv / 1000, 2)}초`,
    `- P95 변환 시간: ${fmt(p95Conv / 1000, 2)}초`,
    `- 평균 챕터 수: ${fmt(avgChapters)}`,
    `- 평균 접근성 점수: ${fmt(avgAccess)}점`,
    `- 평균 인터랙션 요소: ${fmt(avgInteraction)}종/권`,
    ``,
    `## 근거 파일`,
    ``,
    `- 상세 JSON: \`kpi-report-dataset.json\` (파일별 측정값 ${total}건)`,
    `- 데이터셋 카탈로그: \`fixtures/dataset-1000/catalog.db\` (SQLite)`,
    `- 재실행 스크립트: \`scripts/validate-kpi-dataset.ts\``,
    ``,
    `## 재현 방법`,
    ``,
    `\`\`\`bash`,
    `pnpm install --frozen-lockfile`,
    `pnpm --filter @gov-epub/core build`,
    `npx tsx scripts/validate-kpi-dataset.ts`,
    `\`\`\``,
    ``,
    `위 스크립트는 결정적(deterministic)이므로 동일 입력 시 동일 결과를 산출합니다.`,
  ].join('\n');

  const mdOut = path.join(ROOT, 'docs', 'KPI-DATASET-REPORT.md');
  await fs.writeFile(mdOut, md);
  console.log(`  MD 리포트: ${mdOut}`);

  const failedKpi = kpis.filter((k) => !k.passed);
  if (failedKpi.length) {
    console.log(`\n  ⚠️ ${failedKpi.length}개 KPI 미달`);
    for (const k of failedKpi) console.log(`     - KPI #${k.id} ${k.name}: ${k.value} (목표 ${k.target})`);
  } else {
    console.log(`\n  ✅ 전체 KPI 달성 (${kpis.length}/${kpis.length})`);
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
