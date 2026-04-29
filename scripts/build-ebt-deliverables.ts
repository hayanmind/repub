/**
 * EBT 외주 최종 결과물 빌드 (업로드 전용 PDF).
 *
 * 모든 입력·출력은 docs repo(`gov-epub-2026-docs`)를 단일 진실 공급원으로 사용한다.
 * (이전에는 source MD가 별도 repo에 있었으나 submodule 통합 후 docs로 일원화됨.)
 *
 * 원본 MD (편집용):
 *   /Users/jmoh/Workspace/gov-epub-2026-docs/outsourcing/ebt-solution/결과물/
 *     - 연구용역_결과보고서.md
 *     - 납품서.md
 *     - 검수조서.md
 *
 * 날인·서명 이미지 (docs 리포의 .gitignore에 등록되어 외부 노출 금지):
 *   /Users/jmoh/Workspace/gov-epub-2026-docs/seals/
 *     - signature_kim_daehoon.png
 *     - seal_ebt_solution.png
 *     - seal_hayanmind.png
 *
 * 업로드 결과물 PDF (입력과 같은 위치에 출력):
 *     - 연구용역_결과보고서.pdf  (맑은 고딕, EBT 직인)
 *     - 납품서.pdf                (맑은 고딕, EBT+하얀마인드 직인)
 *     - 검수조서.pdf              (맑은 고딕, 김대훈 서명 + 양사 직인)
 *
 * Usage:
 *   npx tsx scripts/build-ebt-deliverables.ts
 */
import { marked } from 'marked';
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const DOCS_ROOT = '/Users/jmoh/Workspace/gov-epub-2026-docs';
const SOURCE = `${DOCS_ROOT}/outsourcing/ebt-solution/결과물`;
const SEALS = `${DOCS_ROOT}/seals`;
const OUT = SOURCE;

const FILES = ['README.md', '연구용역_결과보고서.md', '납품서.md', '검수조서.md'];

const HTML_TEMPLATE = (title: string, body: string) => `<!DOCTYPE html>
<html lang="ko"><head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
@page { size: A4; margin: 20mm 25mm; }
body {
  font-family: "Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", sans-serif;
  font-size: 13px; line-height: 1.7; color: #111;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
  max-width: 210mm; margin: 0 auto; padding: 20mm 25mm;
}
h1 { font-size: 22px; text-align: center; margin-bottom: 12px; letter-spacing: 0.2em; font-weight: 700; }
h2 { font-size: 16px; border-bottom: 2px solid #111; padding-bottom: 4px; margin-top: 28px; page-break-after: avoid; font-weight: 700; }
h3 { font-size: 14px; margin-top: 20px; page-break-after: avoid; font-weight: 700; }
h4 { font-size: 13px; margin-top: 16px; font-weight: 700; }
p { margin: 8px 0; }
table { width: 100%; border-collapse: collapse; font-size: 12px; margin: 12px 0; }
th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; vertical-align: middle; }
th { background: #f5f5f5; font-weight: 700; }
hr { border: none; border-top: 1px solid #ddd; margin: 24px 0; }
ol, ul { padding-left: 24px; }
li { margin-bottom: 4px; }
code { background: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-family: inherit; }
pre { background: #f9f9f9; padding: 12px; border-radius: 4px; overflow-x: auto; white-space: pre-wrap; }
pre code { background: transparent; padding: 0; }
blockquote { border-left: 3px solid #ccc; margin: 12px 0; padding: 2px 12px; color: #555; }
strong { font-weight: 700; }
/* 직인 / 서명 크기 */
img[alt*="직인"] { width: 68px; height: auto; vertical-align: middle; margin-left: 6px; }
img[alt*="서명"] { width: 100px; height: auto; vertical-align: middle; }
/* 서명 블록: 회사명과 직인이 한 줄로 */
p img[alt*="직인"] { display: inline-block; }
@media print { body { padding: 0; } }
</style>
</head><body>${body}</body></html>`;

async function inlineSealImages(html: string): Promise<string> {
  const files = await fs.readdir(SEALS);
  for (const f of files) {
    if (!f.endsWith('.png')) continue;
    const buf = await fs.readFile(path.join(SEALS, f));
    const dataUri = `data:image/png;base64,${buf.toString('base64')}`;
    html = html.split(`src="${f}"`).join(`src="${dataUri}"`);
  }
  return html;
}

async function buildPdf(browser: import('puppeteer').Browser, mdFile: string): Promise<void> {
  const mdPath = path.join(SOURCE, mdFile);
  const outPath = path.join(OUT, mdFile.replace(/\.md$/, '.pdf'));
  const name = path.basename(mdFile, '.md');

  const md = await fs.readFile(mdPath, 'utf8');
  const bodyHtml = await inlineSealImages(await marked.parse(md));
  const fullHtml = HTML_TEMPLATE(name, bodyHtml);

  const page = await browser.newPage();
  await page.setContent(fullHtml, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.pdf({
    path: outPath as `${string}.pdf`,
    format: 'A4',
    printBackground: true,
    margin: { top: '15mm', right: '20mm', bottom: '15mm', left: '20mm' },
  });
  await page.close();

  const size = (await fs.stat(outPath)).size;
  console.log(`  [PDF]  ${name}  →  ${(size / 1024).toFixed(0)}KB`);
}

async function cleanupOldOutputs() {
  if (!existsSync(OUT)) return;
  for (const entry of await fs.readdir(OUT)) {
    if (entry === '데이터셋_및_소스코드' || entry === '.DS_Store') continue;
    if (entry.endsWith('.docx') || entry.endsWith('.pdf') || entry.endsWith('.html') || entry.endsWith('.md')) {
      await fs.unlink(path.join(OUT, entry));
      console.log(`  [rm]   ${entry}`);
    }
  }
}

async function main() {
  marked.setOptions({ gfm: true, breaks: false });

  for (const f of FILES) {
    if (!existsSync(path.join(SOURCE, f))) throw new Error(`원본 MD 없음: ${f}`);
  }
  for (const s of ['signature_kim_daehoon.png', 'seal_ebt_solution.png', 'seal_hayanmind.png']) {
    if (!existsSync(path.join(SEALS, s))) throw new Error(`직인/서명 이미지 없음: ${s}`);
  }

  await fs.mkdir(OUT, { recursive: true });

  console.log('\n[1/2] 이전 결과물 정리');
  await cleanupOldOutputs();

  console.log('\n[2/2] 최종 PDF 생성 (날인 포함)');
  const browser = await puppeteer.launch({ headless: true });
  try {
    for (const f of FILES) await buildPdf(browser, f);
  } finally {
    await browser.close();
  }

  console.log('\n✓ 완료 — 업로드 폴더:');
  console.log(`  ${OUT}\n`);
  const entries = (await fs.readdir(OUT)).filter((e) => e !== '.DS_Store').sort();
  for (const e of entries) {
    const st = await fs.stat(path.join(OUT, e));
    const label = st.isDirectory() ? '[dir]' : `${(st.size / 1024).toFixed(0)}KB`.padStart(7);
    console.log(`    ${label}  ${e}`);
  }
  console.log('');
}

main().catch((err) => {
  console.error('FATAL:', err instanceof Error ? err.message : err);
  process.exit(1);
});
