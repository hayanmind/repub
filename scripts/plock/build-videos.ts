/**
 * Assemble video files from scene images + narration MP3 + subtitle overlay.
 *
 * For each VideoScript:
 *   1. Create SRT subtitle file
 *   2. For each scene: generate a scene MP4 (image + audio, scene duration, with burned subtitle)
 *   3. Concatenate scene MP4s → final MP4 with fade transitions
 *
 * Output:
 *   /Users/jmoh/Workspace/gov-epub-2026-docs/outsourcing/plock/결과물/산출물/02-영상/MP4/{video-id}.mp4
 *   (and paired .srt)
 */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ALL_VIDEOS, type VideoScript, type Scene } from './video-scripts.js';

const ASSETS = '/Users/jmoh/Workspace/gov-epub-2026/scripts/plock/assets';
const OUT_DIR =
  '/Users/jmoh/Workspace/gov-epub-2026-docs/outsourcing/plock/결과물/산출물/02-영상/MP4';
const TMP = join(ASSETS, '.tmp');
const W = 1920;
const H = 1080;

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(TMP, { recursive: true });

function pad(n: number): string {
  return String(Math.floor(n)).padStart(2, '0');
}

function toSrtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec - Math.floor(sec)) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${String(ms).padStart(3, '0')}`;
}

function buildSrt(video: VideoScript): string {
  const lines: string[] = [];
  let t = 0;
  for (let i = 0; i < video.scenes.length; i++) {
    const s = video.scenes[i];
    const start = t;
    const end = t + s.duration;
    lines.push(
      String(i + 1),
      `${toSrtTime(start)} --> ${toSrtTime(end)}`,
      s.subtitle,
      '',
    );
    t = end;
  }
  return lines.join('\n');
}

function sh(cmd: string): void {
  try {
    execSync(cmd, { stdio: 'pipe' });
  } catch (err) {
    const e = err as { stdout?: Buffer; stderr?: Buffer; status?: number };
    const out = e.stdout?.toString() ?? '';
    const errOut = e.stderr?.toString() ?? '';
    const msg = out || errOut || String(err);
    console.error(`\nFFMPEG ERROR (exit ${e.status}):\nCMD: ${cmd}\n${msg.slice(-2500)}`);
    throw err;
  }
}

function buildSceneClip(
  scene: Scene,
  video: VideoScript,
  sceneIdx: number,
  videoDir: string,
): string {
  const narrationMp3 = join(ASSETS, 'narration', video.id, `${scene.id}.mp3`);
  const composedPng = join(
    ASSETS,
    'scenes',
    video.id,
    `${String(sceneIdx).padStart(2, '0')}-${scene.id}.png`,
  );
  const sceneOut = join(videoDir, `${sceneIdx.toString().padStart(2, '0')}-${scene.id}.mp4`);

  // Simpler filter: image is already 1920×1080 with subtitle burned in.
  // Just add fade in/out.
  const vf = `fade=t=in:st=0:d=0.5,fade=t=out:st=${Math.max(0, scene.duration - 0.5)}:d=0.5`;
  const af = `afade=t=in:st=0:d=0.3,afade=t=out:st=${Math.max(0, scene.duration - 0.5)}:d=0.5,apad=whole_dur=${scene.duration}`;

  const hasAudio = existsSync(narrationMp3);
  const audioInput = hasAudio ? `-i "${narrationMp3}"` : `-f lavfi -i anullsrc=r=44100:cl=stereo`;

  const cmd = `ffmpeg -y -loop 1 -i "${composedPng}" ${audioInput} ` +
    `-filter:v "${vf}" -filter:a "${af}" ` +
    `-c:v libx264 -pix_fmt yuv420p -t ${scene.duration} ` +
    `-c:a aac -b:a 128k -ar 44100 -ac 2 ` +
    `-shortest "${sceneOut}" 2>&1`;

  sh(cmd);
  return sceneOut;
}

function concatScenes(clips: string[], outPath: string) {
  const listFile = join(TMP, `list-${Date.now()}.txt`);
  writeFileSync(listFile, clips.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n'));
  sh(`ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${outPath}" 2>&1`);
  rmSync(listFile);
}

function buildVideo(video: VideoScript) {
  console.log(`\n[${video.id}] ${video.title}  target ${video.totalDuration}s (${video.scenes.length} scenes)`);
  const videoDir = join(TMP, video.id);
  mkdirSync(videoDir, { recursive: true });

  // 1) SRT
  const srtPath = join(OUT_DIR, `${video.id}.srt`);
  writeFileSync(srtPath, buildSrt(video));
  console.log(`  ✓ SRT → ${srtPath}`);

  // 2) Scene clips
  const clips: string[] = [];
  for (let i = 0; i < video.scenes.length; i++) {
    const s = video.scenes[i];
    if (!existsSync(s.image)) {
      console.log(`  ✗ scene ${s.id} image missing: ${s.image} — SKIP`);
      continue;
    }
    process.stdout.write(`  building scene ${i + 1}/${video.scenes.length}  ${s.id} ... `);
    const clip = buildSceneClip(s, video, i + 1, videoDir);
    clips.push(clip);
    console.log(`✓ ${s.duration}s`);
  }

  // 3) Concat
  const outPath = join(OUT_DIR, `${video.id}.mp4`);
  concatScenes(clips, outPath);
  const size = statSync(outPath).size;
  console.log(`  ✓ FINAL → ${outPath}  (${(size / 1024 / 1024).toFixed(1)}MB)`);

  // Cleanup scene clips
  rmSync(videoDir, { recursive: true, force: true });
}

function main() {
  console.log('\n→ Building 4 videos with ffmpeg (1920×1080, H.264 + AAC)\n');
  for (const v of ALL_VIDEOS) {
    buildVideo(v);
  }
  rmSync(TMP, { recursive: true, force: true });
  console.log(`\n✓ All videos done → ${OUT_DIR}\n`);
}

main();
