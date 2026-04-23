/**
 * Export video editing project bundle (FCPXML 1.11 + manifest + assets).
 *
 * FCPXML 1.11 schema: https://developer.apple.com/documentation/professional_video_applications/fcpxml_reference
 * Compatible with Final Cut Pro, DaVinci Resolve, Premiere Pro (via DaVinci export).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, statSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { ALL_VIDEOS, type Scene, type VideoScript } from './video-scripts.js';

const OUT_ROOT =
  '/Users/jmoh/Workspace/gov-epub-2026-docs/outsourcing/plock/결과물/산출물/편집원본/영상';
const ASSETS_ROOT = join(OUT_ROOT, 'assets');

// FCPXML uses 30000/1000 timebase for 29.97fps NDF, which is standard broadcast.
// We use integer 30fps for simplicity (30/1s frame duration = 1/30 = 1001/30000s).
// For a clean 30fps, frame duration = "100/3000s" or use rational 1/30.
// We'll use 30fps with "1/30s" frame duration which is valid FCPXML.
const FPS = 30;
const FRAME_DUR = `1/${FPS}s`; // "1/30s"

function escXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Format seconds as FCPXML rational time (e.g. 8 s → "8/1s", 8.5 s → "255/30s"). */
function rt(seconds: number): string {
  // round to frame boundary
  const frames = Math.round(seconds * FPS);
  return `${frames}/${FPS}s`;
}

function copyIfMissing(src: string, dst: string) {
  if (!existsSync(src)) return false;
  if (existsSync(dst) && statSync(dst).size === statSync(src).size) return true;
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(src, dst);
  return true;
}

function imageId(id: string): string { return `img-${id}`; }
function audioId(id: string): string { return `aud-${id}`; }
function formatId(): string { return 'r0'; }

/**
 * Build FCPXML 1.11 for a single video script.
 */
function buildFcpxml(script: VideoScript, assetPaths: Map<string, { image: string; audio: string }>): string {
  const totalDur = script.scenes.reduce((a, s) => a + s.duration, 0);
  const formatRefId = formatId();

  // Resources: format + video assets + audio assets
  const resources: string[] = [];
  resources.push(
    `    <format id="${formatRefId}" name="FFVideoFormat1080p30" frameDuration="${FRAME_DUR}" width="1920" height="1080" colorSpace="1-1-1 (Rec. 709)"/>`,
  );

  const seenImg = new Set<string>();
  const seenAud = new Set<string>();
  for (const scene of script.scenes) {
    const ap = assetPaths.get(scene.id);
    if (!ap) continue;
    if (!seenImg.has(scene.id)) {
      seenImg.add(scene.id);
      resources.push(
        `    <asset id="${imageId(scene.id)}" name="${escXml(scene.id)}-img" uid="${escXml(scene.id)}-img" start="0s" duration="0s" hasVideo="1" format="${formatRefId}" videoSources="1">` +
          `<media-rep kind="original-media" src="file://${escXml(ap.image)}"/></asset>`,
      );
    }
    if (!seenAud.has(scene.id)) {
      seenAud.add(scene.id);
      resources.push(
        `    <asset id="${audioId(scene.id)}" name="${escXml(scene.id)}-aud" uid="${escXml(scene.id)}-aud" start="0s" duration="${rt(scene.duration)}" hasAudio="1" audioSources="1" audioChannels="1" audioRate="44100">` +
          `<media-rep kind="original-media" src="file://${escXml(ap.audio)}"/></asset>`,
      );
    }
  }

  // Spine — sequential video clips with asset-clip, each with embedded audio-channel-source
  // Offsets are cumulative
  let offset = 0;
  const spineClips: string[] = [];
  for (const scene of script.scenes) {
    const dur = rt(scene.duration);
    const off = rt(offset);
    const clip =
      `          <video name="${escXml(scene.id)}" offset="${off}" ref="${imageId(scene.id)}" duration="${dur}" start="0s">\n` +
      `            <asset-clip name="${escXml(scene.id)}-aud" lane="-1" ref="${audioId(scene.id)}" offset="0s" duration="${dur}" start="0s" audioRole="dialogue"/>\n` +
      `            <title name="subtitle-${escXml(scene.id)}" lane="1" offset="0s" duration="${dur}" ref="r1" start="0s">\n` +
      `              <text><text-style ref="ts1">${escXml(scene.subtitle)}</text-style></text>\n` +
      `              <text-style-def id="ts1"><text-style font="Pretendard" fontSize="42" fontColor="1 1 1 1" alignment="center" bold="0"/></text-style-def>\n` +
      `            </title>\n` +
      `          </video>`;
    spineClips.push(clip);
    offset += scene.duration;
  }

  // Basic subtitle effect resource (built-in text generator)
  resources.push(
    `    <effect id="r1" name="Basic Title" uid=".../Titles.localized/Basic Text.localized/Basic Title.localized/Basic Title.moti"/>`,
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.11">
  <resources>
${resources.join('\n')}
  </resources>
  <library location="file:///Users/jmoh/Movies/">
    <event name="${escXml(script.title)}">
      <project name="${escXml(script.title)}" uid="project-${script.id}">
        <sequence format="${formatRefId}" duration="${rt(totalDur)}" tcStart="0s" tcFormat="NDF" audioLayout="stereo" audioRate="48k">
          <spine>
${spineClips.join('\n')}
          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>
`;
}

function buildManifest(script: VideoScript, assetPaths: Map<string, { image: string; audio: string }>): string {
  let offset = 0;
  const rows: string[] = [];
  for (const scene of script.scenes) {
    const start = `${Math.floor(offset / 60).toString().padStart(2, '0')}:${Math.floor(offset % 60).toString().padStart(2, '0')}`;
    const end = offset + scene.duration;
    const endStr = `${Math.floor(end / 60).toString().padStart(2, '0')}:${Math.floor(end % 60).toString().padStart(2, '0')}`;
    const ap = assetPaths.get(scene.id);
    rows.push(
      `| ${scene.id} | ${start}–${endStr} | ${scene.duration}s | \`${ap?.image ? basename(ap.image) : ''}\` | \`${ap?.audio ? basename(ap.audio) : ''}\` | ${scene.subtitle} |`,
    );
    offset += scene.duration;
  }
  const narrationTxt = script.scenes
    .map((s, i) => `### [${String(i + 1).padStart(2, '0')}] ${s.id} (${s.duration}s)\n\n**내레이션**\n> ${s.narration}\n\n**자막**\n> ${s.subtitle}\n`)
    .join('\n');

  return `# ${script.title}

- **ID**: \`${script.id}\`
- **총 길이**: ${script.totalDuration}초
- **씬 개수**: ${script.scenes.length}개
- **해상도**: 1920×1080, 30 fps
- **오디오**: 모노 44.1 kHz (scene별 내레이션)
- **자막**: SRT (\`../assets/${script.id}.srt\`)
- **서비스 URL**: epub-remastering.hayanmind.com

## 타임라인

| 씬 ID | 시작–끝 | 길이 | 이미지 | 내레이션 MP3 | 자막 |
|-------|---------|------|--------|--------------|------|
${rows.join('\n')}

## 내레이션 스크립트 (전체)

${narrationTxt}

## 편집 방법

1. DaVinci Resolve·Final Cut Pro·Premiere Pro에서 **File → Import → XML…** 로 \`${script.id}.fcpxml\` 선택.
2. Media Pool에 이미지/오디오 에셋이 자동 매핑됨 (경로: \`assets/\`).
3. 자막 텍스트는 타임라인의 Title 레이어에 직접 배치되어 있음.
4. BGM을 추가하려면 \`../소스/BGM/\` 의 추천 트랙을 새 오디오 트랙에 드래그.
5. 최종 렌더: H.264 1920×1080 30fps, MP3 오디오 AAC 128kbps 변환.
`;
}

function main() {
  mkdirSync(ASSETS_ROOT, { recursive: true });

  const SRC_SCENE_ROOT = '/Users/jmoh/Workspace/gov-epub-2026/scripts/plock/assets/scenes';
  const SRC_NARR_ROOT = '/Users/jmoh/Workspace/gov-epub-2026/scripts/plock/assets/narration';
  const SRC_SRT_ROOT = '/Users/jmoh/Workspace/gov-epub-2026-docs/outsourcing/plock/결과물/산출물/02-영상/MP4';

  let totalAssets = 0;

  for (const script of ALL_VIDEOS) {
    // Copy scene PNGs + narration MP3s into assets/{videoId}/
    const vidAssetDir = join(ASSETS_ROOT, script.id);
    mkdirSync(vidAssetDir, { recursive: true });

    const assetPaths = new Map<string, { image: string; audio: string }>();

    for (let i = 0; i < script.scenes.length; i++) {
      const scene = script.scenes[i];
      const idxStr = String(i + 1).padStart(2, '0');

      // Try composited scene PNG first
      const compositeImg = join(SRC_SCENE_ROOT, script.id, `${idxStr}-${scene.id}.png`);
      let imgSrc = compositeImg;
      if (!existsSync(compositeImg)) {
        // Fall back to scene.image (could be PNG from card news or bg image)
        imgSrc = scene.image;
      }

      const narrSrc = join(SRC_NARR_ROOT, script.id, `${scene.id}.mp3`);

      const imgDst = join(vidAssetDir, `${idxStr}-${scene.id}.png`);
      const audDst = join(vidAssetDir, `${scene.id}.mp3`);

      if (copyIfMissing(imgSrc, imgDst)) totalAssets++;
      if (copyIfMissing(narrSrc, audDst)) totalAssets++;

      assetPaths.set(scene.id, { image: imgDst, audio: audDst });
    }

    // Copy SRT
    const srtSrc = join(SRC_SRT_ROOT, `${script.id}.srt`);
    const srtDst = join(ASSETS_ROOT, `${script.id}.srt`);
    if (copyIfMissing(srtSrc, srtDst)) totalAssets++;

    // Emit FCPXML
    const fcpxml = buildFcpxml(script, assetPaths);
    const fcpPath = join(OUT_ROOT, `${script.id}.fcpxml`);
    writeFileSync(fcpPath, fcpxml);

    // Emit manifest
    const manifest = buildManifest(script, assetPaths);
    const manPath = join(OUT_ROOT, `${script.id}-프로젝트_매니페스트.md`);
    writeFileSync(manPath, manifest);

    console.log(`  ✓ ${script.id} — FCPXML (${script.scenes.length} scenes, ${script.totalDuration}s) + manifest`);
  }

  // Top-level manifest
  const overview = `# 영상 편집 프로젝트 파일

Final Cut Pro / DaVinci Resolve / Premiere Pro 호환 FCPXML 1.11 포맷.
Adobe Premiere는 직접 import가 제한적이므로, DaVinci Resolve에서 FCPXML을 연 뒤 Premiere용 XML/AAF로 재내보내기 권장.

## 수록 프로젝트

| ID | 제목 | 길이 | 씬 수 |
|----|------|------|-------|
${ALL_VIDEOS.map((v) => `| \`${v.id}\` | ${v.title} | ${v.totalDuration}초 | ${v.scenes.length}개 |`).join('\n')}

## 파일 구조

\`\`\`
영상/
├── {videoId}.fcpxml                  # FCPXML 1.11 프로젝트 파일
├── {videoId}-프로젝트_매니페스트.md   # 타임라인·내레이션·자막 문서
└── assets/
    ├── {videoId}/
    │   ├── 01-*.png ~ NN-*.png       # 씬 이미지
    │   └── *.mp3                     # scene별 내레이션 오디오
    └── {videoId}.srt                 # 자막 파일
\`\`\`

## 편집 환경 권장 사양

- **DaVinci Resolve 18 이상 (무료)** — FCPXML 1.11 지원, 가장 호환성 좋음.
- **Final Cut Pro 10.6 이상 (macOS 유료)** — 네이티브 지원.
- **Adobe Premiere Pro 2024 이상** — DaVinci에서 XML export 경유.

## 해상도·프레임레이트

- 1920×1080, 30fps (FFVideoFormat1080p30)
- 오디오: 모노 44.1 kHz (내레이션) + BGM 추가 시 스테레오 48 kHz로 믹스.
- 색공간: Rec. 709.

## 수정 가능 사항

1. 씬 순서 재배치 → 타임라인에서 드래그.
2. 자막 텍스트 편집 → Title 레이어 선택 후 인스펙터에서 수정.
3. 배경 이미지 교체 → 해당 \`assets/{videoId}/NN-*.png\` 파일 덮어쓰기.
4. 내레이션 재녹음 → 해당 \`assets/{videoId}/*.mp3\` 파일 덮어쓰기, 길이 유지 권장.
5. BGM 추가 → 새 오디오 트랙에 \`../소스/BGM/\` 추천 트랙 드래그.

## 최종 렌더링 설정

- Format: MP4 (H.264)
- Resolution: 1920×1080
- Frame Rate: 30 fps
- Video Bitrate: 8~12 Mbps
- Audio: AAC 128 kbps 스테레오
- 파일명: \`{videoId}.mp4\` (현재 MP4/ 폴더의 결과물과 동일)
`;
  writeFileSync(join(OUT_ROOT, 'README.md'), overview);

  console.log(`\nTotal assets copied: ${totalAssets}`);
  console.log(`  → ${OUT_ROOT}`);
}

main();
