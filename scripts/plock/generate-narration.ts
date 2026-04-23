/**
 * Generate Korean narration MP3s using ElevenLabs API (multilingual_v2).
 * Output: scripts/plock/assets/narration/{video-id}/{scene-id}.mp3
 *
 * Env: ELEVENLABS_API_KEY required (.env.local)
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ALL_VIDEOS, type VideoScript } from './video-scripts.js';

const ASSETS = '/Users/jmoh/Workspace/gov-epub-2026/scripts/plock/assets';

// Load .env.local manually (no dotenv dep at workspace root)
function loadEnv(path: string) {
  if (!existsSync(path)) return;
  const raw = readFileSync(path, 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"\n]*)"?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnv('/Users/jmoh/Workspace/gov-epub-2026/.env.local');
loadEnv('/Users/jmoh/Workspace/gov-epub-2026/.env');

const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) {
  console.error('ELEVENLABS_API_KEY not found in .env.local or .env');
  process.exit(1);
}

// Voice: Jessica (female, young, playful, bright, warm — premade multilingual)
const VOICE_ID = 'cgSgspJ2msm6clMCkdW9';
const MODEL_ID = 'eleven_multilingual_v2';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function generate(text: string, outPath: string): Promise<{ bytes: number; chars: number }> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': API_KEY as string,
      },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        voice_settings: {
          stability: 0.55,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true,
        },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ElevenLabs API error ${res.status}: ${body.slice(0, 300)}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(outPath, buf);
  return { bytes: buf.length, chars: text.length };
}

async function processVideo(video: VideoScript, force: boolean): Promise<{ ok: number; skipped: number; chars: number; bytes: number }> {
  const dir = join(ASSETS, 'narration', video.id);
  mkdirSync(dir, { recursive: true });
  let ok = 0;
  let skipped = 0;
  let chars = 0;
  let bytes = 0;

  for (const scene of video.scenes) {
    const out = join(dir, `${scene.id}.mp3`);
    if (!force && existsSync(out)) {
      console.log(`  ↷ ${video.id}/${scene.id} (exists)`);
      skipped++;
      continue;
    }
    process.stdout.write(`  → ${video.id}/${scene.id} (${scene.narration.length} chars) ... `);
    const result = await generate(scene.narration, out);
    ok++;
    chars += result.chars;
    bytes += result.bytes;
    console.log(`✓ ${(result.bytes / 1024).toFixed(0)}KB`);
    await sleep(300); // avoid rate limits
  }
  return { ok, skipped, chars, bytes };
}

async function main() {
  const force = process.argv.includes('--force');
  console.log(`\n→ Generating narration via ElevenLabs (voice: Rachel, model: ${MODEL_ID})`);
  console.log(`  force=${force}\n`);

  let totalOk = 0;
  let totalSkipped = 0;
  let totalChars = 0;
  let totalBytes = 0;

  for (const v of ALL_VIDEOS) {
    console.log(`[${v.id}] ${v.title}`);
    const r = await processVideo(v, force);
    totalOk += r.ok;
    totalSkipped += r.skipped;
    totalChars += r.chars;
    totalBytes += r.bytes;
  }

  console.log(`\n✓ Done. Generated ${totalOk} (skipped ${totalSkipped})`);
  console.log(`  Total characters billed: ${totalChars.toLocaleString()} (ElevenLabs quota)`);
  console.log(`  Total MP3 size: ${(totalBytes / 1024 / 1024).toFixed(1)} MB\n`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
