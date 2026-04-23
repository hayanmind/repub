/**
 * Compose video scenes v3 — overlay text anchored to TOP, bottom 30% reserved
 * for SRT subtitle rendering (player-side). Ensures no collision.
 */
import { mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer, { Browser } from 'puppeteer';
import { ALL_VIDEOS, type VideoScript, type Scene } from './video-scripts.js';

const ASSETS = '/Users/jmoh/Workspace/gov-epub-2026/scripts/plock/assets';
const SCENES_DIR = join(ASSETS, 'scenes');
mkdirSync(SCENES_DIR, { recursive: true });

const W = 1920;
const H = 1080;

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function imgToDataUrl(path: string): string {
  const lower = path.toLowerCase();
  const ext = lower.endsWith('.png') ? 'png' : 'jpeg';
  const buf = readFileSync(path);
  return `data:image/${ext};base64,${buf.toString('base64')}`;
}

// Split on " — " or " · ", but ONLY when the separator is at parenthesis depth 0.
// Prevents "파일 업로드 (개별 · 배치)" being wrongly split.
function splitSubtitle(s: string): [string, string] {
  const findAtDepthZero = (sep: string): number => {
    let depth = 0;
    for (let i = 0; i <= s.length - sep.length; i++) {
      const ch = s[i];
      if (ch === '(' || ch === '[' || ch === '【' || ch === '「') depth++;
      else if (ch === ')' || ch === ']' || ch === '】' || ch === '」') depth = Math.max(0, depth - 1);
      if (depth === 0 && s.substr(i, sep.length) === sep) return i;
    }
    return -1;
  };
  for (const sep of [' — ', ' · ']) {
    const idx = findAtDepthZero(sep);
    if (idx >= 0) {
      return [s.slice(0, idx).trim(), s.slice(idx + sep.length).trim()];
    }
  }
  return [s, ''];
}

function sceneHtml(scene: Scene): string {
  const dataUrl = imgToDataUrl(scene.image);
  const [mainTxt, chipTxt] = splitSubtitle(scene.subtitle);

  return `<!DOCTYPE html>
<html><head><style>
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
*{margin:0;padding:0;box-sizing:border-box;}
html,body{
  width:${W}px; height:${H}px;
  overflow:hidden;
  font-family:'Pretendard Variable',sans-serif;
  background:#0F0F23;
  color:#ffffff;
}
.stage{position:relative; width:100%; height:100%;}

/* Background image */
.bg{
  position:absolute; inset:0;
  background-image:url('${dataUrl}');
  background-size:cover;
  background-position:center;
  filter:saturate(1.08) contrast(1.02);
}

/* Top dark gradient — makes top text readable.
   Bottom gradient is LIGHT so SRT subtitle burn-in is visible. */
.ovl-top{
  position:absolute; top:0; left:0; right:0; height:55%;
  background: linear-gradient(180deg, rgba(15,15,35,0.88) 0%, rgba(15,15,35,0.65) 55%, rgba(15,15,35,0) 100%);
}
/* Subtle bottom darken so SRT subtitles (rendered by player) stay readable if player overlays on light area */
.ovl-bottom{
  position:absolute; bottom:0; left:0; right:0; height:22%;
  background: linear-gradient(0deg, rgba(15,15,35,0.8) 0%, rgba(15,15,35,0) 100%);
}

.ovl-tint{
  position:absolute; inset:0;
  background: radial-gradient(ellipse at 30% 20%, rgba(99,102,241,0.18) 0%, transparent 55%);
  mix-blend-mode: screen;
}

.content{
  position:relative; z-index:3;
  width:100%; height:100%;
  padding:80px 120px;
  /* Text anchored to TOP — bottom 30% left clear for SRT */
  display:flex;
  flex-direction:column;
  align-items:flex-start;
  justify-content:flex-start;
  gap:18px;
}
.accent-bar{
  width:72px; height:6px;
  background: linear-gradient(90deg, #6366F1 0%, #EC4899 100%);
  border-radius:4px;
  margin-bottom:14px;
  box-shadow: 0 0 28px #6366F1aa;
}
.chip{
  display:inline-flex; align-items:center;
  padding:9px 20px;
  background:rgba(255,255,255,0.12);
  border:1px solid rgba(255,255,255,0.25);
  border-radius:999px;
  font-size:17px; font-weight:700;
  letter-spacing:0.14em;
  color:#E0E7FF;
  backdrop-filter:blur(12px);
  text-transform:uppercase;
  width:fit-content;
}
.title{
  font-size:62px;
  font-weight:800;
  letter-spacing:-0.02em;
  line-height:1.12;
  color:white;
  text-shadow: 0 4px 32px rgba(0,0,0,0.65);
  max-width:80%;
}
</style></head>
<body>
<div class="stage">
  <div class="bg"></div>
  <div class="ovl-top"></div>
  <div class="ovl-bottom"></div>
  <div class="ovl-tint"></div>
  <div class="content">
    <div class="accent-bar"></div>
    ${chipTxt ? `<div class="chip">${esc(chipTxt)}</div>` : ''}
    <div class="title">${esc(mainTxt)}</div>
  </div>
</div>
</body></html>`;
}

async function composeOne(
  browser: Browser,
  video: VideoScript,
  scene: Scene,
  idx: number,
): Promise<string> {
  const videoDir = join(SCENES_DIR, video.id);
  mkdirSync(videoDir, { recursive: true });
  const outPath = join(videoDir, `${String(idx).padStart(2, '0')}-${scene.id}.png`);

  if (!existsSync(scene.image)) {
    throw new Error(`image missing: ${scene.image}`);
  }

  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.setContent(sceneHtml(scene), { waitUntil: 'load' });
  await Promise.race([
    page.evaluateHandle('document.fonts.ready'),
    new Promise((r) => setTimeout(r, 2500)),
  ]);
  await page.screenshot({ path: outPath as `${string}.png`, type: 'png' });
  await page.close();
  return outPath;
}

async function main() {
  const browser = await puppeteer.launch({ headless: true });
  console.log('\n→ Composing scenes v3 (text anchored TOP, bottom reserved for SRT)\n');

  let total = 0;
  for (const video of ALL_VIDEOS) {
    console.log(`[${video.id}]`);
    for (let i = 0; i < video.scenes.length; i++) {
      const s = video.scenes[i];
      try {
        await composeOne(browser, video, s, i + 1);
        console.log(`  ✓ scene ${i + 1}/${video.scenes.length} ${s.id}`);
        total++;
      } catch (err) {
        console.log(`  ✗ ${s.id}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  await browser.close();
  console.log(`\n✓ ${total} scenes composed.`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
