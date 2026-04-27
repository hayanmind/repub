/**
 * 최종평가 자료 PDF 빌드.
 *
 * 입력 (docs 리포):
 *   /Users/jmoh/Workspace/gov-epub-2026-docs/source/8. 최종평가/
 *     - 01. 최종보고서.md
 *     - 02. 최종평가 발표자료.md
 *     - README.md
 *
 * 출력 (같은 폴더에 PDF):
 *   - 01. 최종보고서.pdf
 *   - 02. 최종평가 발표자료.pdf
 *   - README.pdf
 *
 * 폰트: 맑은 고딕 (사용자 ~/Library/Fonts/ 에 설치된 것 사용)
 *
 * Usage: npx tsx scripts/build-final-eval-pdfs.ts
 */
import { marked } from 'marked';
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = '/Users/jmoh/Workspace/gov-epub-2026-docs/source/8. 최종평가';
const FILES = [
  'README.md',
  '01. 최종보고서.md',
  '02. 최종평가 발표자료.md',
];

const HTML_TEMPLATE = (title: string, body: string) => `<!DOCTYPE html>
<html lang="ko"><head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
@page { size: A4; margin: 20mm; }
body {
  font-family: "Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", sans-serif;
  font-size: 10.5pt;
  line-height: 1.6;
  color: #111;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  max-width: 210mm;
  margin: 0 auto;
  padding: 20mm;
}
h1 { font-size: 20pt; text-align: center; margin: 8pt 0 16pt; letter-spacing: 0.04em; font-weight: 700; border-bottom: 2px solid #111; padding-bottom: 8pt; page-break-after: avoid; }
h2 { font-size: 14pt; margin: 24pt 0 10pt; font-weight: 700; border-bottom: 1.5pt solid #333; padding-bottom: 4pt; page-break-after: avoid; }
h3 { font-size: 12pt; margin: 18pt 0 8pt; font-weight: 700; page-break-after: avoid; }
h4 { font-size: 11pt; margin: 14pt 0 6pt; font-weight: 700; }
p { margin: 6pt 0; }
table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin: 10pt 0; page-break-inside: avoid; }
th, td { border: 0.5pt solid #999; padding: 5pt 8pt; text-align: left; vertical-align: top; }
th { background: #f1f5f9; font-weight: 700; }
hr { border: none; border-top: 0.5pt solid #ccc; margin: 18pt 0; }
ol, ul { padding-left: 22pt; margin: 6pt 0; }
li { margin-bottom: 3pt; }
code { background: #f5f5f5; padding: 1pt 4pt; border-radius: 2pt; font-family: "D2Coding", "Menlo", "Consolas", monospace; font-size: 9.5pt; }
pre { background: #f8fafc; padding: 10pt 12pt; border-radius: 3pt; overflow-x: auto; white-space: pre-wrap; border: 0.5pt solid #e2e8f0; font-size: 9pt; line-height: 1.4; page-break-inside: avoid; }
pre code { background: transparent; padding: 0; font-size: 9pt; }
blockquote { border-left: 2.5pt solid #4F46E5; margin: 10pt 0; padding: 4pt 12pt; color: #475569; background: #f8fafc; }
strong { font-weight: 700; }
a { color: #4F46E5; text-decoration: none; }
@media print { body { padding: 0; } h2 { page-break-before: auto; } }
</style>
</head><body>${body}</body></html>`;

async function main() {
  marked.setOptions({ gfm: true, breaks: false });

  console.log(`\n[Final Eval PDF Build] target = ${ROOT}\n`);

  const browser = await puppeteer.launch({ headless: true });
  try {
    for (const fileName of FILES) {
      const mdPath = path.join(ROOT, fileName);
      const pdfPath = path.join(ROOT, fileName.replace(/\.md$/, '.pdf'));
      const name = path.basename(fileName, '.md');

      try {
        await fs.access(mdPath);
      } catch {
        console.log(`  SKIP ${name}  (not found)`);
        continue;
      }

      const md = await fs.readFile(mdPath, 'utf8');
      const bodyHtml = await marked.parse(md);
      const fullHtml = HTML_TEMPLATE(name, bodyHtml);

      const page = await browser.newPage();
      await page.setContent(fullHtml, { waitUntil: 'networkidle0', timeout: 60000 });
      await page.pdf({
        path: pdfPath as `${string}.pdf`,
        format: 'A4',
        printBackground: true,
        margin: { top: '15mm', right: '18mm', bottom: '15mm', left: '18mm' },
      });
      await page.close();

      const sz = (await fs.stat(pdfPath)).size;
      console.log(`  ${name}  →  ${(sz / 1024).toFixed(0)} KB`);
    }
  } finally {
    await browser.close();
  }

  console.log('\n✓ 완료\n');
}

main().catch((e) => {
  console.error('FATAL:', e instanceof Error ? e.message : e);
  process.exit(1);
});
