/**
 * Compose video scenes with AI background image + overlay + large title + subtitle bar.
 * Cinematic full-bleed design, 1920x1080.
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

function sceneHtml(scene: Scene): string {
  const dataUrl = imgToDataUrl(scene.image);
  // Split subtitle into main + optional sub (on — or ·)
  const [mainSub, subSub] = scene.subtitle.includes(' — ')
    ? scene.subtitle.split(' — ', 2)
    : scene.subtitle.includes(' · ')
    ? scene.subtitle.split(' · ', 2)
    : [scene.subtitle, ''];

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
.stage{
  position:relative; width:100%; height:100%;
  display:block;
}
.bg{
  position:absolute; inset:0;
  background-image:url('${dataUrl}');
  background-size:cover;
  background-position:center;
  filter:saturate(1.08) contrast(1.02);
}
.ovl1{
  position:absolute; inset:0;
  background: linear-gradient(180deg, rgba(15,15,35,0.3) 0%, rgba(15,15,35,0.6) 55%, rgba(15,15,35,0.95) 100%);
}
.ovl2{
  position:absolute; inset:0;
  background: radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(0,0,0,0.4) 100%);
}
.content{
  position:relative; z-index:3;
  width:100%; height:100%;
  padding:90px 120px 200px;
  display:flex;
  flex-direction:column;
  justify-content:flex-end;
  gap:20px;
}
.chip{
  display:inline-flex; align-items:center;
  padding:10px 22px;
  background:rgba(255,255,255,0.10);
  border:1px solid rgba(255,255,255,0.25);
  border-radius:999px;
  font-size:17px; font-weight:700;
  letter-spacing:0.14em;
  color:#E0E7FF;
  width:fit-content;
  backdrop-filter:blur(12px);
  text-transform:uppercase;
}
.title{
  font-size:66px;
  font-weight:800;
  letter-spacing:-0.02em;
  line-height:1.1;
  color:white;
  text-shadow: 0 4px 40px rgba(0,0,0,0.7);
  max-width:85%;
}
.subsub{
  margin-top:8px;
  font-size:28px;
  font-weight:500;
  color:#CBD5E1;
  text-shadow: 0 2px 20px rgba(0,0,0,0.7);
  letter-spacing:0.02em;
}
.accent-bar{
  width:80px; height:6px;
  background: linear-gradient(90deg, #6366F1 0%, #EC4899 100%);
  border-radius:4px;
  margin-bottom:12px;
  box-shadow: 0 0 32px #6366F188;
}
</style></head>
<body>
<div class="stage">
  <div class="bg"></div>
  <div class="ovl1"></div>
  <div class="ovl2"></div>
  <div class="content">
    <div class="accent-bar"></div>
    ${subSub ? `<div class="chip">${esc(subSub)}</div>` : ''}
    <div class="title">${esc(mainSub)}</div>
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
  console.log('\n→ Composing scenes v2 (AI background + cinematic overlay)\n');

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
