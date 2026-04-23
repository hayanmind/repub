/**
 * Render 20 card news sets × ~8 slides × 3 formats → PNG (~480 images).
 * Uses Puppeteer headless browser with HTML/CSS template.
 *
 * Formats:
 *   - ig   1080 × 1080  (Instagram square)
 *   - blog 1920 × 1080  (Blog 16:9)
 *   - a4    827 × 1170  (A4 @ 100dpi → prints to A4 portrait)
 *
 * Output: docs-repo/outsourcing/plock/결과물/산출물/01-카드뉴스/PNG/{category}/{setName}/{idx}-{format}.png
 */
import { readFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer, { Browser } from 'puppeteer';
import type { CardSet, Slide } from './parse-cardnews.js';

// When BRAND_REMOVED_AT is later than PNG mtime, re-render. Otherwise skip.
const BRAND_REMOVED_AT = new Date('2026-04-19T12:40:00Z').getTime();

const DATA_JSON = '/Users/jmoh/Workspace/gov-epub-2026/scripts/plock/cardnews.json';
const PNG_ROOT =
  '/Users/jmoh/Workspace/gov-epub-2026-docs/outsourcing/plock/결과물/산출물/01-카드뉴스/PNG';

type Format = 'ig' | 'blog' | 'a4';

const FORMAT_SIZE: Record<Format, { w: number; h: number; dsf: number }> = {
  ig: { w: 1080, h: 1080, dsf: 1 },
  blog: { w: 1920, h: 1080, dsf: 1 },
  a4: { w: 827, h: 1170, dsf: 2 }, // doubled via deviceScaleFactor for print-quality
};

function esc(s?: string): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderSlideHtml(slide: Slide, set: CardSet, format: Format, totalSlides: number): string {
  const size = FORMAT_SIZE[format];
  const isPortrait = format === 'a4';
  const isSquare = format === 'ig';

  const setCode = `C${String(set.categoryIdx).padStart(2, '0')}-S${String(set.setIdx).padStart(2, '0')}`;
  const pageCode = `${slide.idx}/${totalSlides}`;

  // Template-specific body markup
  let content = '';
  switch (slide.template) {
    case 'cover':
      content = `
        <div class="cover-layout">
          <h1 class="title title-xl">${esc(slide.title)}</h1>
          ${slide.subtitle ? `<p class="subtitle">${esc(slide.subtitle)}</p>` : ''}
        </div>`;
      break;

    case 'number':
      content = `
        <div class="number-layout">
          ${slide.stat ? `<div class="stat-number">${esc(slide.stat.number)}</div>` : ''}
          <h2 class="title title-lg">${esc(slide.title)}</h2>
          ${slide.body ? `<p class="body">${esc(slide.body)}</p>` : ''}
        </div>`;
      break;

    case 'hook':
      content = `
        <div class="hook-layout">
          <div class="hook-accent"></div>
          <h2 class="title title-lg">${esc(slide.title)}</h2>
          ${slide.body ? `<p class="body">${esc(slide.body)}</p>` : ''}
        </div>`;
      break;

    case 'list':
      content = `
        <div class="list-layout">
          <h2 class="title title-md">${esc(slide.title)}</h2>
          <ul class="bullets">
            ${(slide.bullets ?? []).map((b) => `<li>${esc(b)}</li>`).join('\n')}
          </ul>
        </div>`;
      break;

    case 'compare':
      content = `
        <div class="compare-layout">
          <h2 class="title title-md">${esc(slide.title)}</h2>
          ${slide.body ? `<p class="body">${esc(slide.body)}</p>` : ''}
          <div class="compare-badges">
            <span class="badge badge-before">BEFORE</span>
            <span class="badge-arrow">→</span>
            <span class="badge badge-after">AFTER</span>
          </div>
        </div>`;
      break;

    case 'solution':
      content = `
        <div class="solution-layout">
          <h2 class="title title-lg">${esc(slide.title)}</h2>
          ${slide.body ? `<p class="body">${esc(slide.body)}</p>` : ''}
          <div class="flow-icons">
            <div class="flow-step"><div class="flow-circle">1</div><span>입력</span></div>
            <div class="flow-line"></div>
            <div class="flow-step"><div class="flow-circle flow-primary">2</div><span>AI 처리</span></div>
            <div class="flow-line"></div>
            <div class="flow-step"><div class="flow-circle">3</div><span>완성</span></div>
          </div>
        </div>`;
      break;

    case 'cta':
      content = `
        <div class="cta-layout">
          <h2 class="title title-lg">${esc(slide.title)}</h2>
          ${slide.subtitle ? `<p class="subtitle">${esc(slide.subtitle)}</p>` : ''}
          <div class="cta-button">지금 시작하기 →</div>
          <p class="url">epub-remastering.hayanmind.com</p>
        </div>`;
      break;

    default:
      content = `
        <div class="body-layout">
          <h2 class="title title-md">${esc(slide.title)}</h2>
          ${slide.body ? `<p class="body">${esc(slide.body)}</p>` : ''}
        </div>`;
  }

  const fmtClass = `fmt-${format}`;

  // brand text ("HAYANMIND" top-left) removed on 2026-04-19 per user request
  return `<!DOCTYPE html>
<html lang="ko"><head>
<meta charset="UTF-8">
<style>
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
/* brand text ("HAYANMIND" top-left) removed on 2026-04-19 per user request */

* { margin: 0; padding: 0; box-sizing: border-box; }

html, body {
  width: ${size.w}px;
  height: ${size.h}px;
  overflow: hidden;
  font-family: 'Pretendard Variable', -apple-system, sans-serif;
  background: #FAFAFA;
  color: #111827;
  font-weight: 500;
  -webkit-font-smoothing: antialiased;
}

.stage {
  width: 100%;
  height: 100%;
  position: relative;
  padding: ${isSquare ? '90px' : isPortrait ? '90px 80px' : '80px 120px'};
  display: flex;
  flex-direction: column;
  background:
    linear-gradient(180deg, #FFFFFF 0%, #FAFAFA 100%);
}

/* Left indigo accent bar */
.stage::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 4px;
  background: #4F46E5;
}

/* Top-left brand */
.brand {
  position: absolute;
  top: 48px; left: 48px;
  font-weight: 800;
  font-size: ${isPortrait ? '16px' : '18px'};
  letter-spacing: 0.18em;
  color: #4F46E5;
}

/* Top-right set code */
.set-code {
  position: absolute;
  top: 48px; right: 48px;
  font-size: ${isPortrait ? '13px' : '14px'};
  color: #94A3B8;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.05em;
}

/* Bottom-right slide counter */
.counter {
  position: absolute;
  bottom: 40px; right: 48px;
  font-size: ${isPortrait ? '13px' : '14px'};
  color: #94A3B8;
  font-variant-numeric: tabular-nums;
}

/* Bottom-left category tag */
.category-tag {
  position: absolute;
  bottom: 40px; left: 48px;
  font-size: ${isPortrait ? '12px' : '13px'};
  color: #4F46E5;
  background: #EEF2FF;
  padding: 4px 12px;
  border-radius: 999px;
  font-weight: 600;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* Title sizes (responsive per format) */
.title { font-weight: 700; letter-spacing: -0.02em; line-height: 1.18; color: #0F172A; }
.title-xl { font-size: ${isSquare ? '96px' : isPortrait ? '72px' : '104px'}; line-height: 1.1; }
.title-lg { font-size: ${isSquare ? '72px' : isPortrait ? '56px' : '80px'}; }
.title-md { font-size: ${isSquare ? '54px' : isPortrait ? '42px' : '60px'}; }

.subtitle {
  font-size: ${isSquare ? '28px' : isPortrait ? '22px' : '30px'};
  color: #475569;
  margin-top: 24px;
  font-weight: 500;
  line-height: 1.5;
}

.body {
  font-size: ${isSquare ? '24px' : isPortrait ? '20px' : '26px'};
  color: #334155;
  line-height: 1.7;
  margin-top: 28px;
  max-width: 85%;
}

/* --- Templates --- */
.cover-layout { justify-content: center; }

.number-layout { gap: 24px; }
.stat-number {
  font-size: ${isSquare ? '220px' : isPortrait ? '180px' : '260px'};
  font-weight: 800;
  color: #4F46E5;
  line-height: 1;
  letter-spacing: -0.04em;
}

.hook-layout {
  position: relative;
  padding-left: 40px;
}
.hook-accent {
  position: absolute; left: 0; top: 14px;
  width: 12px; height: ${isSquare ? '110px' : '80px'};
  background: #F97316;
  border-radius: 2px;
}

.list-layout { gap: 32px; }
.bullets {
  list-style: none;
  margin-top: 24px;
  font-size: ${isSquare ? '26px' : isPortrait ? '22px' : '28px'};
  color: #334155;
  line-height: 1.8;
}
.bullets li {
  position: relative;
  padding-left: 32px;
  margin-bottom: 14px;
}
.bullets li::before {
  content: '';
  position: absolute;
  left: 0; top: 16px;
  width: 10px; height: 10px;
  background: #4F46E5;
  border-radius: 50%;
}

.compare-layout { gap: 36px; }
.compare-badges { display: flex; align-items: center; gap: 24px; margin-top: 32px; }
.badge {
  font-size: ${isSquare ? '22px' : '24px'};
  padding: 10px 28px;
  border-radius: 999px;
  font-weight: 700;
  letter-spacing: 0.1em;
}
.badge-before { background: #F1F5F9; color: #64748B; }
.badge-after { background: #4F46E5; color: white; }
.badge-arrow { color: #94A3B8; font-size: 32px; }

.solution-layout { gap: 32px; }
.flow-icons {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 48px;
}
.flow-step { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.flow-circle {
  width: 80px; height: 80px;
  border-radius: 50%;
  background: #F1F5F9;
  color: #64748B;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 28px;
}
.flow-primary { background: #4F46E5; color: white; }
.flow-line { flex: 1; height: 2px; background: #E2E8F0; border-top: 2px dashed #CBD5E1; background: transparent; }
.flow-step span { font-size: 18px; color: #64748B; font-weight: 600; }

.cta-layout { justify-content: center; align-items: flex-start; gap: 24px; }
.cta-button {
  margin-top: 40px;
  display: inline-block;
  padding: 22px 44px;
  background: #4F46E5;
  color: white;
  font-size: ${isSquare ? '28px' : '32px'};
  font-weight: 700;
  border-radius: 14px;
}
.url {
  margin-top: 18px;
  font-size: ${isSquare ? '20px' : '22px'};
  color: #64748B;
  letter-spacing: 0.05em;
}

.body-layout { justify-content: center; }

/* Subtle noise overlay for paper texture */
.stage::after {
  content: '';
  position: absolute; inset: 0;
  background-image: radial-gradient(circle at 1px 1px, rgba(0,0,0,0.015) 1px, transparent 0);
  background-size: 4px 4px;
  pointer-events: none;
}
</style>
</head><body>
  <div class="stage ${fmtClass}">
    <div class="set-code">${esc(setCode)}</div>
    <div class="content">${content}</div>
    <div class="category-tag">${esc(set.category)}</div>
    <div class="counter">${pageCode}</div>
  </div>
</body></html>`;
}

async function renderOne(
  browser: Browser,
  slide: Slide,
  set: CardSet,
  format: Format,
  totalSlides: number,
  outPath: string,
): Promise<'rendered' | 'skipped'> {
  // Skip if existing file is newer than brand removal
  if (existsSync(outPath)) {
    const mtime = statSync(outPath).mtimeMs;
    if (mtime >= BRAND_REMOVED_AT) return 'skipped';
  }
  const size = FORMAT_SIZE[format];
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(120000);
  page.setDefaultTimeout(120000);
  await page.setViewport({ width: size.w, height: size.h, deviceScaleFactor: size.dsf });
  const html = renderSlideHtml(slide, set, format, totalSlides);
  await page.setContent(html, { waitUntil: 'load', timeout: 120000 });
  // Give fonts a chance, but don't block indefinitely
  await Promise.race([
    page.evaluateHandle('document.fonts.ready'),
    new Promise((r) => setTimeout(r, 3000)),
  ]);
  await page.screenshot({ path: outPath as `${string}.png`, type: 'png', omitBackground: false });
  await page.close();
  return 'rendered';
}

async function main() {
  const data = JSON.parse(readFileSync(DATA_JSON, 'utf8')) as { sets: CardSet[] };
  const formats: Format[] = ['ig', 'blog', 'a4'];

  const browser = await puppeteer.launch({ headless: true });
  const t0 = Date.now();
  let done = 0;
  const total = data.sets.reduce((n, s) => n + s.slides.length, 0) * formats.length;

  for (const set of data.sets) {
    const catDir = `${String(set.categoryIdx).padStart(2, '0')}-${set.category.replace(/\s+/g, '')}`;
    const setDir = join(PNG_ROOT, catDir, set.setName);
    mkdirSync(setDir, { recursive: true });

    for (const slide of set.slides) {
      for (const format of formats) {
        const file = `${String(slide.idx).padStart(2, '0')}-${format}.png`;
        const outPath = join(setDir, file);
        await renderOne(browser, slide, set, format, set.slides.length, outPath);
        done++;
        if (done % 20 === 0 || done === total) {
          const elapsed = (Date.now() - t0) / 1000;
          const rate = done / elapsed;
          const eta = (total - done) / Math.max(rate, 0.01);
          process.stdout.write(
            `\r  ${done}/${total}  ${rate.toFixed(1)}/s  ETA ${Math.round(eta)}s      `,
          );
        }
      }
    }
  }

  await browser.close();
  console.log(`\n\n✓ Done in ${((Date.now() - t0) / 1000).toFixed(1)}s — ${done} PNGs generated`);
  console.log(`  → ${PNG_ROOT}`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
