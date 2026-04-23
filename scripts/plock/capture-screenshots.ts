/**
 * Capture screenshots of localhost:3000 pages for use in videos.
 * Output: scripts/plock/assets/*.png (1920×1080 for video)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer, { Browser } from 'puppeteer';

const LOCAL = 'http://localhost:3000';
const ASSETS = '/Users/jmoh/Workspace/gov-epub-2026/scripts/plock/assets';
mkdirSync(ASSETS, { recursive: true });

const VIDEO_W = 1920;
const VIDEO_H = 1080;

interface Capture {
  name: string;
  url: string;
  wait?: number; // ms extra
}

const PAGES: Capture[] = [
  { name: 'landing', url: '/', wait: 1000 },
  { name: 'upload', url: '/upload', wait: 1500 },
  { name: 'convert', url: '/convert', wait: 1500 },
  { name: 'preview', url: '/preview', wait: 2000 },
  { name: 'report', url: '/report', wait: 1500 },
  { name: 'guide', url: '/guide', wait: 1000 },
  { name: 'settings', url: '/settings', wait: 1000 },
];

async function warmup(url: string): Promise<void> {
  // Trigger Next.js dev server compilation before puppeteer
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(90000) });
    await res.text();
  } catch {
    // ignore — puppeteer will retry
  }
}

async function capture(browser: Browser, c: Capture): Promise<void> {
  const page = await browser.newPage();
  await page.setViewport({ width: VIDEO_W, height: VIDEO_H, deviceScaleFactor: 1 });
  const url = `${LOCAL}${c.url}`;
  try {
    // Warmup first (Next.js dev compiles lazily)
    await warmup(url);
    await page.goto(url, { waitUntil: 'load', timeout: 180000 });
    await new Promise((r) => setTimeout(r, c.wait ?? 1500));
    const outPath = join(ASSETS, `${c.name}.png`);
    await page.screenshot({ path: outPath as `${string}.png`, type: 'png' });
    console.log(`  ✓ ${c.name.padEnd(12)} ${url}`);
  } catch (err) {
    console.log(`  ✗ ${c.name.padEnd(12)} ${err instanceof Error ? err.message : err}`);
  } finally {
    await page.close();
  }
}

// Generate simple generated title/cta cards as fallback
async function captureHtmlCard(browser: Browser, name: string, html: string) {
  const page = await browser.newPage();
  await page.setViewport({ width: VIDEO_W, height: VIDEO_H, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.evaluateHandle('document.fonts.ready');
  const outPath = join(ASSETS, `${name}.png`);
  await page.screenshot({ path: outPath as `${string}.png`, type: 'png' });
  await page.close();
  console.log(`  ✓ ${name} (generated)`);
}

const titleHtml = `<!DOCTYPE html><html><head><style>
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
*{margin:0;padding:0;box-sizing:border-box;}
body{width:${VIDEO_W}px;height:${VIDEO_H}px;display:flex;flex-direction:column;align-items:center;justify-content:center;
  font-family:'Pretendard Variable',sans-serif;background:#0F172A;color:white;gap:28px;}
h1{font-size:96px;font-weight:800;letter-spacing:-0.02em;}
p{font-size:32px;color:#94A3B8;font-weight:500;}
.logo{font-size:24px;color:#4F46E5;font-weight:800;letter-spacing:0.3em;margin-bottom:48px;}
.accent{width:80px;height:4px;background:#4F46E5;border-radius:2px;margin-top:12px;}
</style></head><body>
<div class="logo">HAYANMIND</div>
<h1>ePub 3.0 인터랙티브 리마스터링</h1>
<div class="accent"></div>
<p>AI가 구조를 재해석하고, 접근성을 자동으로 적용합니다.</p>
</body></html>`;

const ctaHtml = `<!DOCTYPE html><html><head><style>
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
*{margin:0;padding:0;box-sizing:border-box;}
body{width:${VIDEO_W}px;height:${VIDEO_H}px;display:flex;flex-direction:column;align-items:center;justify-content:center;
  font-family:'Pretendard Variable',sans-serif;background:#FAFAFA;color:#0F172A;gap:24px;}
h1{font-size:84px;font-weight:800;letter-spacing:-0.02em;color:#4F46E5;}
p{font-size:30px;color:#475569;font-weight:500;}
.btn{margin-top:40px;padding:22px 56px;background:#4F46E5;color:white;font-size:28px;font-weight:700;border-radius:14px;}
.url{margin-top:20px;font-size:24px;color:#64748B;letter-spacing:0.05em;}
</style></head><body>
<h1>낡은 책에, 새로운 감각을.</h1>
<p>HAYANMIND</p>
<div class="btn">지금 시작하기 →</div>
<div class="url">epub-remastering.hayanmind.com</div>
</body></html>`;

async function main() {
  const browser = await puppeteer.launch({ headless: true });
  console.log('\n→ Capturing pages from localhost:3000 ...\n');
  for (const p of PAGES) await capture(browser, p);

  console.log('\n→ Generating title/cta cards ...\n');
  await captureHtmlCard(browser, 'title', titleHtml);
  await captureHtmlCard(browser, 'cta', ctaHtml);

  await browser.close();
  console.log('\n✓ Done.\n');
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
