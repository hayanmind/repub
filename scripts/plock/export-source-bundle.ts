/**
 * Export the "소스" bundle: narration scripts, SRT copies, font README,
 * image attribution, BGM recommendations, design tokens, Figma import guide.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { ALL_VIDEOS } from './video-scripts.js';
import { PALETTES } from './design-system.js';

const SRC_ROOT =
  '/Users/jmoh/Workspace/gov-epub-2026-docs/outsourcing/plock/결과물/산출물/편집원본/소스';
const CARD_ROOT =
  '/Users/jmoh/Workspace/gov-epub-2026-docs/outsourcing/plock/결과물/산출물/편집원본/카드뉴스';
const VID_ROOT =
  '/Users/jmoh/Workspace/gov-epub-2026-docs/outsourcing/plock/결과물/산출물/편집원본/영상';
const BG_SRC = '/Users/jmoh/Workspace/gov-epub-2026/scripts/plock/assets/bg';
const SRT_SRC = '/Users/jmoh/Workspace/gov-epub-2026-docs/outsourcing/plock/결과물/산출물/02-영상/MP4';

function copyIfMissing(src: string, dst: string) {
  if (!existsSync(src)) return false;
  if (existsSync(dst) && statSync(dst).size === statSync(src).size) return true;
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(src, dst);
  return true;
}

function copyTree(src: string, dst: string): number {
  if (!existsSync(src)) return 0;
  const s = statSync(src);
  if (s.isFile()) {
    if (copyIfMissing(src, dst)) return 1;
    return 0;
  }
  let n = 0;
  mkdirSync(dst, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    n += copyTree(join(src, entry.name), join(dst, entry.name));
  }
  return n;
}

function main() {
  // ===== 1. Narration scripts MD =====
  mkdirSync(SRC_ROOT, { recursive: true });
  let narrMd = `# 영상 내레이션 스크립트 — 전체 4편

모든 내레이션은 한국어, 평서체, 차분한 톤. macOS \`say\` 명령 또는 한국어 TTS(예: 네이버 클로바, Typecast) 로 녹음 가능.

서비스 URL: **epub-remastering.hayanmind.com**

---

`;
  for (const script of ALL_VIDEOS) {
    narrMd += `## ${script.title} (\`${script.id}\`)\n\n`;
    narrMd += `- **총 길이**: ${script.totalDuration}초\n`;
    narrMd += `- **씬 개수**: ${script.scenes.length}개\n\n`;
    let offset = 0;
    for (let i = 0; i < script.scenes.length; i++) {
      const s = script.scenes[i];
      const start = `${String(Math.floor(offset / 60)).padStart(2, '0')}:${String(Math.floor(offset % 60)).padStart(2, '0')}`;
      offset += s.duration;
      const end = `${String(Math.floor(offset / 60)).padStart(2, '0')}:${String(Math.floor(offset % 60)).padStart(2, '0')}`;
      narrMd += `### ${String(i + 1).padStart(2, '0')}. ${s.id}  \`${start}–${end}\` (${s.duration}s)\n\n`;
      narrMd += `**내레이션**\n\n> ${s.narration}\n\n`;
      narrMd += `**자막 (on-screen)**\n\n> ${s.subtitle}\n\n`;
    }
    narrMd += `---\n\n`;
  }
  writeFileSync(join(SRC_ROOT, '내레이션_스크립트.md'), narrMd);

  // ===== 2. Copy SRT files =====
  const srtDir = join(SRC_ROOT, '자막');
  mkdirSync(srtDir, { recursive: true });
  let srtCount = 0;
  for (const script of ALL_VIDEOS) {
    if (copyIfMissing(join(SRT_SRC, `${script.id}.srt`), join(srtDir, `${script.id}.srt`))) srtCount++;
  }
  writeFileSync(
    join(srtDir, 'README.md'),
    `# 자막 파일 (SRT)

4편 영상의 자막(내레이션 요약본)을 SRT 포맷으로 제공. DaVinci Resolve, Final Cut Pro, Premiere Pro 모두 import 가능. YouTube 업로드 시 자막 트랙으로 바로 사용 가능.

## 파일 목록

${ALL_VIDEOS.map((v) => `- \`${v.id}.srt\` — ${v.title}`).join('\n')}

## 인코딩

UTF-8 (BOM 없음). 한글·영문·숫자 포함. 각 씬의 시작·종료 시각은 초 단위 정수.

## 번역

자막을 영어·일본어로 번역하려면 \`../내레이션_스크립트.md\`를 기반으로 DeepL·Google 번역 후 SRT 시간표를 유지한 채 텍스트만 교체.
`,
  );

  // ===== 3. Font README =====
  const fontDir = join(SRC_ROOT, '폰트');
  mkdirSync(fontDir, { recursive: true });
  writeFileSync(
    join(fontDir, 'Pretendard_LICENSE_README.md'),
    `# Pretendard 폰트 사용 안내

## 폰트 정보

- **이름**: Pretendard
- **설계자**: 길형진 (orioncactus)
- **라이선스**: SIL Open Font License 1.1 (상업적 사용·수정·재배포 자유)
- **공식 저장소**: https://github.com/orioncactus/pretendard
- **최신 릴리스**: https://github.com/orioncactus/pretendard/releases

## 다운로드

\`\`\`bash
curl -L -o Pretendard-1.3.9.zip \\
  https://github.com/orioncactus/pretendard/releases/download/v1.3.9/Pretendard-1.3.9.zip
unzip Pretendard-1.3.9.zip
# public/static/PretendardVariable.ttf 를 시스템에 설치
\`\`\`

## 웹 로드 (카드뉴스 HTML에 내장됨)

HTML 편집 원본은 이미 jsDelivr CDN을 통해 Pretendard Variable 을 로드한다.

\`\`\`html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>
  body { font-family: 'Pretendard Variable', -apple-system, sans-serif; }
</style>
\`\`\`

## 프로젝트 사용 범위

- 카드뉴스 20세트 × 3포맷 (477장)
- 영상 자막·타이틀 (4편)
- 대시보드 UI (epub-remastering.hayanmind.com)

## 라이선스 전문

라이선스 전문은 https://github.com/orioncactus/pretendard/blob/main/LICENSE 에서 확인.
상업적 이용, 수정, 재배포, 내장(embedding) 모두 허용됨. 저작권 고지 표시만 의무.

## 왜 Pretendard인가

- 한글·영문·숫자 간 조형 통일성이 높음.
- OFL 라이선스로 저작권 이슈 없음.
- Variable font 지원 (weight 45~920).
- 국내 서비스에서 가장 널리 사용됨 (카카오·네이버·토스·당근 등).
`,
  );

  // ===== 4. Image assets copy =====
  const imgDir = join(SRC_ROOT, '이미지', '배경');
  mkdirSync(imgDir, { recursive: true });
  const copied = copyTree(BG_SRC, imgDir);
  writeFileSync(
    join(SRC_ROOT, '이미지', '출처.md'),
    `# 이미지 소스 및 저작권

## 생성 방식

모든 배경 이미지는 **Google Gemini 2.5 Flash Image (nano-banana-pro-preview)** 모델로 자동 생성.
텍스트 프롬프트를 통해 카테고리별 무드와 구도를 지정하여 생성.

## 파일 수

- **카테고리 대표 이미지**: 15장 (5 카테고리 × 3 variants)
- **영상 씬 배경**: 9장 (title/landing/convert/preview/report/accessibility/opensource/upload/cta)
- **슬라이드별 배경**: 159장 (20 세트의 각 슬라이드별 톤 맞춤)
- **합계**: 183장

## 프롬프트 예시 (카테고리별)

| 카테고리 | 톤 | 프롬프트 샘플 |
|---------|-----|---------------|
| 01-서비스소개 | Indigo/Violet, 신뢰 | "abstract flowing indigo and violet gradient mesh, soft bokeh, technology tone" |
| 02-기술차별점 | Emerald/Cyan, 쾌속 | "cyber emerald and cyan light particles, code grid, fast motion blur" |
| 03-활용사례 | Amber/Warm, 따뜻함 | "warm amber sunset tone, paper texture, hand-crafted publishing atmosphere" |
| 04-도입가이드 | Violet/Pink, 섬세 | "violet and soft pink abstract curves, geometric shapes, minimalist" |
| 05-시장트렌드 | Rose/Crimson, 임팩트 | "rose and crimson dynamic curves, market chart aesthetic, bold lighting" |

## 저작권 / 상업적 사용

- **Google Gemini 생성 이미지 사용 약관**에 따라 상업적 이용·재편집·재배포 가능.
- 출처: https://ai.google.dev/gemini-api/terms
- 본 프로젝트의 이미지는 과제(한국출판문화산업진흥원) 납품·홍보·오픈소스 배포 목적에 제약 없이 사용 가능.

## 재생성 방법

\`scripts/plock/generate-backgrounds.ts\`, \`scripts/plock/generate-slide-backgrounds.ts\` 스크립트로 재생성 가능.
GEMINI_API_KEY 환경변수 필요.

## 용량

전체 ${copied}개 파일, 약 110MB.
`,
  );

  // ===== 5. BGM recommendations =====
  const bgmDir = join(SRC_ROOT, 'BGM');
  mkdirSync(bgmDir, { recursive: true });
  writeFileSync(
    join(bgmDir, '추천트랙.md'),
    `# 배경 음악(BGM) 추천 리스트

영상 4편은 내레이션과 자막 중심 구조로, BGM 없이도 완결된다. 필요시 아래 로열티 프리 트랙을 추가할 수 있다.

## 용도별 권장 톤

| 영상 | 톤 | 추천 스타일 |
|------|-----|------------|
| \`demo-full\` / \`demo-short\` | 차분·신뢰·기술 | ambient electronica, lo-fi piano |
| \`promo-full\` / \`promo-short\` | 서정·감성·희망 | cinematic strings, soft piano |

## 추천 트랙 (저작권 무료·상업적 이용 가능)

### 1. YouTube Audio Library
- **Approach** by Ooyy — ambient piano, 3:21 · 차분·신뢰 계열
- **Dreams** by Joakim Karud — chill lo-fi, 3:00 · 데모 배경용
- **Peace** by Atch — minimal ambient, 2:45 · 홍보 계열
- 다운로드: https://studio.youtube.com → 오디오 보관함

### 2. Pixabay Music (https://pixabay.com/music/)
- **"Inspiring Cinematic"** (다수) · promo-full 서정 톤
- **"Ambient Piano"** (다수) · demo 차분 톤
- CC0, 저작자 표시 불필요.

### 3. Freesound (https://freesound.org)
- 사용자 업로드 작품. CC-BY 또는 CC0 선택적 필터링.
- 검색 키워드: \`ambient pad\`, \`soft piano loop\`, \`cinematic inspire\`.

### 4. Incompetech (https://incompetech.com/music/royalty-free/music.html)
- Kevin MacLeod, CC-BY 4.0. 저작자 표시 필수.

## 사용 방법

1. 위 사이트에서 트랙 다운로드 (MP3 또는 WAV).
2. DaVinci Resolve·Final Cut에서 오디오 트랙 2에 드래그.
3. 내레이션 트랙과 레벨 분리: 내레이션 -6dB, BGM -18 ~ -24dB 권장.
4. 트랙 시작·끝에서 1초 fade in/out.

## 대안: 즉석 앰비언트 생성

ffmpeg로 단순 사인파 패드 60초 루프를 만들 수 있다.

\`\`\`bash
ffmpeg -f lavfi -i "sine=frequency=220:duration=60, atrim=start=0:end=60, volume=0.1" \\
  -f lavfi -i "sine=frequency=330:duration=60, volume=0.08" \\
  -filter_complex "[0][1]amix=inputs=2" \\
  -c:a libmp3lame -b:a 192k bgm-ambient.mp3
\`\`\`

## 저작권 안전 체크리스트

- 유튜브 Content ID 클레임 방지: YouTube Audio Library 우선 사용.
- 행정 납품 자료: CC0 또는 CC-BY만 사용, 출처 명시.
- 상업 배포: 라이선스 범위 재확인 (CC-BY-NC 금지).
`,
  );

  // ===== 6. Design tokens JSON =====
  const tokens = {
    $schema: 'https://design-tokens.github.io/community-group/format/tokens.json',
    description: '하얀마인드 카드뉴스·영상 디자인 토큰 (plock 납품 기준)',
    typography: {
      primary: 'Pretendard Variable',
      fallback: '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif',
      weights: { regular: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800, black: 900 },
    },
    sizes: {
      card: { ig: { w: 1080, h: 1080 }, blog: { w: 1920, h: 1080 }, a4: { w: 827, h: 1170 } },
      video: { w: 1920, h: 1080, fps: 30 },
    },
    palettes: PALETTES,
    radii: { sm: '4px', md: '8px', lg: '16px', xl: '20px', pill: '999px' },
    shadows: {
      soft: '0 8px 32px rgba(0,0,0,0.3)',
      strong: '0 20px 80px rgba(0,0,0,0.4)',
      glow: '0 0 60px currentColor',
    },
    service: {
      domain: 'epub-remastering.hayanmind.com',
      tagline: '낡은 책에, 새로운 감각을',
      org: '(주)하얀마인드',
    },
  };
  writeFileSync(join(CARD_ROOT, 'design-tokens.json'), JSON.stringify(tokens, null, 2));

  // ===== 7. Figma import guide =====
  writeFileSync(
    join(CARD_ROOT, 'FIGMA_IMPORT_가이드.md'),
    `# Figma / Adobe Illustrator / Photoshop 변환 가이드

카드뉴스 편집 원본은 **HTML + CSS + 배경 JPG** 형태로 제공된다. 원본 AI/PSD/Figma 파일이 필요한 경우 아래 절차로 변환한다.

## 1. HTML → Figma

### 권장 플러그인: html.to.design

1. Figma Community에서 **"html.to.design"** 플러그인 설치: https://www.figma.com/community/plugin/1159123024924461424/HTML.to.Design
2. 카드뉴스 HTML 파일을 브라우저로 열기 (예: \`편집원본/카드뉴스/HTML/01-서비스소개/세트1-ePub30변환_클릭한번/01-blog.html\`).
3. Figma에서 플러그인 실행 → "Import from URL" 또는 "Paste HTML" 선택 → HTML 전체 소스 붙여넣기.
4. 레이어·색상·폰트가 자동 매핑되어 Figma 프레임으로 생성됨.

### 대안: Figma Import by Anima

- Anima 플러그인도 유사 기능 제공: https://www.figma.com/community/plugin/857346721138265956

### 주의

- 배경 이미지는 상대 경로 \`./assets/*.jpg\` 이므로 HTML을 로컬 서버(\`python -m http.server\`)로 실행 후 URL을 플러그인에 입력해야 이미지가 보인다.
- CSS 변수·gradient는 Figma에서 근사치 Linear/Radial Gradient로 변환됨.

## 2. HTML → Adobe Illustrator (AI)

1. SVG 사본 사용 → \`편집원본/카드뉴스/SVG/{카테고리}/{세트명}/*.svg\` 파일을 Illustrator에서 직접 열기.
2. 배경 이미지는 SVG의 \`<image href="...">\` 링크로 참조되므로, HTML 폴더의 \`assets/\`를 같은 상대 경로에 유지해야 표시됨.
3. Illustrator에서 텍스트·벡터 레이어 분리 후 AI 포맷으로 저장.

## 3. HTML → Adobe Photoshop (PSD)

1. 브라우저에서 HTML을 열고 전체 영역 스크린샷 → PSD로 저장.
2. 또는 Puppeteer 스크립트로 PNG 추출 후 Photoshop에서 레이어화.
3. 정확한 레이어 구조가 필요한 경우 **html2canvas + Photoshop Generator** 조합 사용.

## 디자인 토큰

\`design-tokens.json\` 에 카테고리별 팔레트(5세트), 타이포그래피, 크기 규격이 정리되어 있다. Figma Variables·Tokens Studio 플러그인으로 직접 import 가능.

## 폰트

Pretendard Variable (OFL 1.1). 상세: \`../소스/폰트/Pretendard_LICENSE_README.md\`.

## 포맷별 캔버스 크기

| 포맷 | 크기 | 용도 |
|------|------|------|
| ig   | 1080 × 1080 | Instagram 피드 |
| blog | 1920 × 1080 | Blog, YouTube, 발표자료 |
| a4   | 827 × 1170 (96dpi) | 인쇄용 A4 세로 |

## 서비스 URL 일관성

모든 카드뉴스·영상·프레젠테이션의 CTA 슬라이드에는 **epub-remastering.hayanmind.com** 을 사용.
\`hayanmind.com\` 단독 사용 금지.
`,
  );

  // ===== 8. Top-level source README =====
  writeFileSync(
    join(SRC_ROOT, 'README.md'),
    `# 소스 번들

카드뉴스·영상 편집에 사용된 원본 소스(폰트·이미지·자막·내레이션·BGM 참조)를 한 곳에 모은 번들.

## 구조

\`\`\`
소스/
├── README.md                 # 이 문서
├── 내레이션_스크립트.md       # 영상 4편의 전체 내레이션 + 자막 + 타이밍
├── 자막/
│   ├── demo-full.srt
│   ├── demo-short.srt
│   ├── promo-full.srt
│   └── promo-short.srt
├── 폰트/
│   └── Pretendard_LICENSE_README.md
├── 이미지/
│   ├── 출처.md
│   └── 배경/                 # AI 생성 배경 183장 (약 110MB)
│       ├── 01-서비스소개/
│       ├── 02-기술차별점/
│       ├── 03-활용사례/
│       ├── 04-도입가이드/
│       ├── 05-시장트렌드/
│       ├── slides/           # 슬라이드별 배경
│       └── video/            # 영상 씬 배경
└── BGM/
    └── 추천트랙.md            # 로열티 프리 BGM 추천 리스트
\`\`\`

## 저작권

- **폰트 (Pretendard)**: OFL 1.1, 상업적 사용 가능
- **이미지 (Gemini 생성)**: Google Gemini 약관에 따라 상업적 사용 가능
- **BGM**: 실제 트랙 파일은 미포함. 라이선스 안전한 추천 리스트 제공.
- **내레이션·자막**: 본 프로젝트 고유 저작물, 하얀마인드 소유.

## 서비스 URL

**epub-remastering.hayanmind.com** (일관적으로 사용)
`,
  );

  console.log(`  ✓ 내레이션 스크립트 + ${srtCount}개 SRT + 폰트 README + 이미지 ${copied}개 + BGM 리스트 + design-tokens.json + Figma 가이드`);
  console.log(`  → ${SRC_ROOT}`);
}

main();
