/**
 * Recursively convert every .md file under Plock's 결과물 tree into .pdf,
 * preserving directory structure. Leaves the generated HTML side by side too.
 * Optionally deletes originals (--delete).
 *
 * Usage:
 *   npx tsx scripts/plock/md-to-pdf-all.ts           # convert only, keep .md
 *   npx tsx scripts/plock/md-to-pdf-all.ts --delete  # convert then rm .md
 */
import { marked } from 'marked';
import puppeteer from 'puppeteer';
import { readdirSync, readFileSync, writeFileSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = '/Users/jmoh/Workspace/gov-epub-2026-docs/outsourcing/ebt-solution/결과물';
const DELETE = process.argv.includes('--delete');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name.endsWith('.md')) out.push(p);
  }
  return out;
}

const TEMPLATE = (title: string, body: string) => `<!DOCTYPE html>
<html lang="ko"><head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
@page { size: A4; margin: 20mm 25mm; }
body {
  font-family: 'Pretendard Variable', -apple-system, sans-serif;
  font-size: 12.5px;
  line-height: 1.7;
  color: #0F172A;
  max-width: 210mm;
  margin: 0 auto;
  padding: 20mm 25mm;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
h1 { font-size: 22px; text-align: center; margin: 4px 0 16px; letter-spacing: 0.1em; page-break-after: avoid; }
h2 { font-size: 16px; border-bottom: 2px solid #111; padding-bottom: 4px; margin: 28px 0 12px; page-break-after: avoid; }
h3 { font-size: 14px; margin: 20px 0 8px; page-break-after: avoid; }
h4 { font-size: 13px; margin: 16px 0 6px; }
p { margin: 8px 0; }
table { width: 100%; border-collapse: collapse; font-size: 11.5px; margin: 12px 0; }
th, td { border: 1px solid #CBD5E1; padding: 6px 10px; text-align: left; vertical-align: top; }
th { background: #F1F5F9; font-weight: 600; }
hr { border: none; border-top: 1px solid #E2E8F0; margin: 24px 0; }
ol, ul { padding-left: 22px; }
li { margin-bottom: 4px; }
code { background: #F1F5F9; padding: 2px 5px; border-radius: 3px; font-size: 11.5px; font-family: ui-monospace, monospace; }
pre { background: #F8FAFC; padding: 12px; border-radius: 4px; overflow-x: auto; border: 1px solid #E2E8F0; }
pre code { background: transparent; padding: 0; }
blockquote { border-left: 3px solid #CBD5E1; margin: 12px 0; padding: 4px 14px; color: #475569; background: #F8FAFC; }
a { color: #4F46E5; text-decoration: none; }
img { max-width: 100%; height: auto; }
@media print { body { padding: 0; } }
</style>
</head><body>
${body}
</body></html>`;

async function main() {
  marked.setOptions({ gfm: true, breaks: false });

  const files = walk(ROOT);
  console.log(`\n→ ${files.length} MD files found. Delete originals: ${DELETE ? 'YES' : 'NO'}\n`);

  const browser = await puppeteer.launch({ headless: true });
  let ok = 0;
  let fail = 0;
  const t0 = Date.now();

  for (const mdPath of files) {
    const pdfPath = mdPath.replace(/\.md$/, '.pdf');
    const rel = mdPath.replace(ROOT + '/', '');
    try {
      const md = readFileSync(mdPath, 'utf8');
      if (md.trim().length === 0) {
        console.log(`  ↷ ${rel}  (empty)`);
        continue;
      }
      const bodyHtml = await marked.parse(md);
      const title = rel.split('/').pop()!.replace(/\.md$/, '');
      const fullHtml = TEMPLATE(title, bodyHtml);

      const page = await browser.newPage();
      await page.setContent(fullHtml, { waitUntil: 'networkidle0', timeout: 60000 });
      await page.pdf({
        path: pdfPath as `${string}.pdf`,
        format: 'A4',
        printBackground: true,
        margin: { top: '15mm', right: '20mm', bottom: '15mm', left: '20mm' },
      });
      await page.close();

      const sz = statSync(pdfPath).size;
      ok++;
      if (ok % 5 === 0 || ok === files.length)
        process.stdout.write(`\r  ${ok}/${files.length}  ${((Date.now() - t0) / 1000).toFixed(0)}s     `);

      if (DELETE) unlinkSync(mdPath);
    } catch (err) {
      fail++;
      console.log(`\n  ✗ ${rel}  ${err instanceof Error ? err.message : err}`);
    }
  }
  process.stdout.write('\n');
  await browser.close();
  console.log(`\n✓ Done in ${((Date.now() - t0) / 1000).toFixed(1)}s — ok=${ok} fail=${fail}`);
  if (DELETE) console.log(`  Originals deleted: ${ok} .md files`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
