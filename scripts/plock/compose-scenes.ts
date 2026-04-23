/**
 * Compose each scene's base image + subtitle overlay into a single 1920x1080 PNG
 * using Puppeteer (since homebrew ffmpeg lacks libfreetype/drawtext).
 *
 * Output: scripts/plock/assets/scenes/{video-id}/{sceneIdx}-{scene.id}.png
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
  const ext = path.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
  const buf = readFileSync(path);
  return `data:image/${ext};base64,${buf.toString('base64')}`;
}

function sceneHtml(scene: Scene): string {
  const dataUrl = imgToDataUrl(scene.image);
  return `<!DOCTYPE html>
<html><head><style>
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#0F172A;font-family:'Pretendard Variable',sans-serif;}
.stage{
  position:relative; width:100%; height:100%;
  display:flex; align-items:center; justify-content:center;
  background:#0F172A;
}
.bg{
  max-width:100%; max-height:100%;
  object-fit:contain;
}
/* brand overlay removed on 2026-04-19 per user request */
.subtitle-bar{
  position:absolute; bottom:0; left:0; right:0;
  height:180px;
  background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 40%, rgba(0,0,0,0.92) 100%);
  display:flex; align-items:center; justify-content:center;
  padding:0 80px;
}
.subtitle-text{
  color:white; font-size:44px; font-weight:600;
  text-align:center; line-height:1.4;
  letter-spacing:-0.01em;
  max-width:1600px;
  text-shadow: 0 2px 8px rgba(0,0,0,0.8);
}
</style></head>
<body>
<div class="stage">
  <img class="bg" src="${dataUrl}" />
  <div class="subtitle-bar">
    <div class="subtitle-text">${esc(scene.subtitle)}</div>
  </div>
</div>
</body></html>`;
}

async function composeOne(browser: Browser, video: VideoScript, scene: Scene, idx: number): Promise<string> {
  const videoDir = join(SCENES_DIR, video.id);
  mkdirSync(videoDir, { recursive: true });
  const outPath = join(videoDir, `${String(idx).padStart(2, '0')}-${scene.id}.png`);

  if (!existsSync(scene.image)) {
    throw new Error(`image missing: ${scene.image}`);
  }

  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.setContent(sceneHtml(scene), { waitUntil: 'load' });
  await page.evaluateHandle('document.fonts.ready');
  await page.screenshot({ path: outPath as `${string}.png`, type: 'png' });
  await page.close();
  return outPath;
}

async function main() {
  const browser = await puppeteer.launch({ headless: true });
  console.log('\n→ Composing scenes with subtitles\n');

  let total = 0;
  for (const video of ALL_VIDEOS) {
    console.log(`[${video.id}]`);
    for (let i = 0; i < video.scenes.length; i++) {
      const s = video.scenes[i];
      try {
        const p = await composeOne(browser, video, s, i + 1);
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
