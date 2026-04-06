/**
 * HTML → PDF 일괄 변환 스크립트
 * Usage: npx tsx scripts/html-to-pdf.ts
 */
import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const files = [
  // 이비티솔루션
  'outsourcing/ebt-solution/결과물/연구용역_결과보고서.html',
  'outsourcing/ebt-solution/결과물/납품서.html',
  'outsourcing/ebt-solution/결과물/검수조서.html',
  // 플락
  'outsourcing/plock/결과물/제안요청서.html',
  'outsourcing/plock/결과물/과업내용서.html',
  'outsourcing/plock/결과물/비교견적서.html',
  // 발표자료
  'docs/presentation/최종성과보고_발표자료.html',
];

async function main() {
  const browser = await puppeteer.launch({ headless: true });

  for (const relPath of files) {
    const htmlPath = path.join(ROOT, relPath);
    const pdfPath = htmlPath.replace(/\.html$/, '.pdf');
    const name = path.basename(relPath, '.html');

    try {
      await fs.access(htmlPath);
    } catch {
      console.log(`  SKIP ${name} (파일 없음)`);
      continue;
    }

    process.stdout.write(`  [PDF] ${name}... `);
    const page = await browser.newPage();
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0', timeout: 30000 });

    const isPresentation = relPath.includes('발표자료');
    await page.pdf({
      path: pdfPath,
      format: isPresentation ? undefined : 'A4',
      ...(isPresentation ? { width: '960px', height: '540px' } : {}),
      printBackground: true,
      margin: isPresentation
        ? { top: '0', right: '0', bottom: '0', left: '0' }
        : { top: '20mm', right: '25mm', bottom: '20mm', left: '25mm' },
    });

    await page.close();
    const stat = await fs.stat(pdfPath);
    console.log(`✓ (${(stat.size / 1024).toFixed(0)}KB)`);
  }

  await browser.close();
  console.log('\n  완료!');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
