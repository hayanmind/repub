/**
 * MD → HTML → PDF 변환 스크립트 (플락 외주 결과물 전용).
 *
 * 대상 파일은 docs 리포 (`/Users/jmoh/Workspace/gov-epub-2026-docs/`)에 있음.
 *
 * Usage: npx tsx scripts/md-to-html-pdf.ts
 */
import { marked } from 'marked';
import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

const DOCS_ROOT = '/Users/jmoh/Workspace/gov-epub-2026-docs';

const files = [
  'outsourcing/plock/결과물/결과보고서.md',
  'outsourcing/plock/결과물/납품서.md',
  'outsourcing/plock/결과물/검수조서.md',
];

const HTML_TEMPLATE = (title: string, body: string) => `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');

@page { size: A4; margin: 20mm 25mm; }

body {
  font-family: 'Pretendard Variable', -apple-system, sans-serif;
  font-size: 13px;
  line-height: 1.7;
  color: #111;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  max-width: 210mm;
  margin: 0 auto;
  padding: 20mm 25mm;
}

h1 { font-size: 22px; text-align: center; margin-bottom: 12px; letter-spacing: 0.2em; }
h2 { font-size: 16px; border-bottom: 2px solid #111; padding-bottom: 4px; margin-top: 28px; page-break-after: avoid; }
h3 { font-size: 14px; margin-top: 20px; page-break-after: avoid; }
h4 { font-size: 13px; margin-top: 16px; }

p { margin: 8px 0; }

table { width: 100%; border-collapse: collapse; font-size: 12px; margin: 12px 0; }
th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; vertical-align: top; }
th { background: #f5f5f5; font-weight: 600; }

hr { border: none; border-top: 1px solid #ddd; margin: 24px 0; }

ol, ul { padding-left: 24px; }
li { margin-bottom: 4px; }

code { background: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-size: 12px; font-family: ui-monospace, monospace; }
pre { background: #f9f9f9; padding: 12px; border-radius: 4px; overflow-x: auto; }
pre code { background: transparent; padding: 0; }

blockquote {
  border-left: 3px solid #ccc;
  margin: 12px 0;
  padding: 2px 12px;
  color: #555;
}

@media print {
  body { padding: 0; }
  h2 { page-break-before: auto; }
}
</style>
</head>
<body>
${body}
</body>
</html>`;

async function main() {
  marked.setOptions({ gfm: true, breaks: false });

  const browser = await puppeteer.launch({ headless: true });
  console.log('');

  for (const relPath of files) {
    const mdPath = path.join(DOCS_ROOT, relPath);
    const htmlPath = mdPath.replace(/\.md$/, '.html');
    const pdfPath = mdPath.replace(/\.md$/, '.pdf');
    const name = path.basename(relPath, '.md');

    try {
      await fs.access(mdPath);
    } catch {
      console.log(`  SKIP ${name} (파일 없음: ${mdPath})`);
      continue;
    }

    process.stdout.write(`  [${name}] MD → HTML ... `);
    const md = await fs.readFile(mdPath, 'utf8');
    const bodyHtml = await marked.parse(md);
    const fullHtml = HTML_TEMPLATE(name, bodyHtml);
    await fs.writeFile(htmlPath, fullHtml);
    process.stdout.write(`HTML ✓ `);

    process.stdout.write(`PDF ... `);
    const page = await browser.newPage();
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', right: '20mm', bottom: '15mm', left: '20mm' },
    });
    await page.close();
    const stat = await fs.stat(pdfPath);
    console.log(`PDF ✓ (${(stat.size / 1024).toFixed(0)}KB)`);
  }

  await browser.close();
  console.log('\n  완료!\n');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
