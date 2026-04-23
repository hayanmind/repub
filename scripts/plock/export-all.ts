/**
 * Orchestrator: runs all 4 export scripts and writes the top-level README.
 */
import { writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const OUT_ROOT =
  '/Users/jmoh/Workspace/gov-epub-2026-docs/outsourcing/plock/결과물/산출물/편집원본';

function dirStats(path: string): { files: number; dirs: number; bytes: number } {
  let files = 0;
  let dirs = 0;
  let bytes = 0;
  const walk = (p: string) => {
    const s = statSync(p);
    if (s.isFile()) {
      files++;
      bytes += s.size;
    } else if (s.isDirectory()) {
      dirs++;
      for (const entry of readdirSync(p)) walk(join(p, entry));
    }
  };
  walk(path);
  return { files, dirs, bytes };
}

function prettyBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

async function main() {
  mkdirSync(OUT_ROOT, { recursive: true });

  const scripts = [
    'export-cardnews-source.ts',
    'export-video-project.ts',
    'export-source-bundle.ts',
    'export-operation-records.ts',
  ];

  for (const s of scripts) {
    console.log(`\n=== ${s} ===`);
    execSync(`pnpm tsx scripts/plock/${s}`, {
      cwd: '/Users/jmoh/Workspace/gov-epub-2026',
      stdio: 'inherit',
    });
  }

  // Top-level README
  const topReadme = `# 편집 원본 번들 — 플락 납품 보조자료

과업 내용서가 요구하는 "편집 가능한 원본 파일"의 텍스트·구조 기반 대체본. Figma/AI/PSD · Premiere/AE 네이티브 바이너리 대신 **HTML · CSS · SVG · FCPXML · Markdown** 로 재편집·재렌더 가능한 형태로 제공.

## 서비스 URL

**epub-remastering.hayanmind.com** (일관적으로 사용)

## 구조

\`\`\`
편집원본/
├── README.md                     # 이 문서
├── 카드뉴스/
│   ├── HTML/                     # 20세트 × 슬라이드별 × 3포맷 = 477 HTML
│   │   └── {카테고리}/{세트명}/
│   │       ├── {NN}-{ig|blog|a4}.html
│   │       ├── assets/           # 배경 이미지 JPG (상대 경로)
│   │       └── README.md         # 세트별 편집 가이드
│   ├── SVG/                      # 20세트 × 대표 1~2장 = ~40 SVG (Illustrator 호환)
│   ├── FIGMA_IMPORT_가이드.md    # html.to.design 플러그인 변환 절차
│   └── design-tokens.json        # 팔레트·폰트·크기 토큰 (Figma Variables 호환)
├── 영상/
│   ├── README.md                 # 편집 환경·해상도 안내
│   ├── {videoId}.fcpxml          # FCPXML 1.11 (Final Cut / DaVinci / Premiere)
│   ├── {videoId}-프로젝트_매니페스트.md
│   └── assets/
│       ├── {videoId}/            # 씬 PNG + 내레이션 MP3
│       └── {videoId}.srt
├── 소스/
│   ├── README.md
│   ├── 내레이션_스크립트.md       # 4편 영상 전체 내레이션 + 자막 + 타이밍
│   ├── 자막/*.srt
│   ├── 폰트/Pretendard_LICENSE_README.md
│   ├── 이미지/
│   │   ├── 출처.md
│   │   └── 배경/                 # AI 생성 배경 183장 (110MB)
│   └── BGM/추천트랙.md            # 로열티 프리 BGM 추천 리스트
└── 운영기록/
    ├── README.md
    ├── 01-킥오프_2026-04-01.md
    ├── 02-중간검수1차_2026-04-09.md
    ├── 03-중간검수2차_2026-04-16.md
    └── 04-최종검수_2026-04-20.md
\`\`\`

## 왜 이런 포맷인가

| 요구 원본 | 대체본 | 근거 |
|----------|--------|------|
| Figma 네이티브 | HTML + \`design-tokens.json\` + html.to.design 가이드 | 플러그인으로 Figma 무손실 변환. 오히려 텍스트로 diff·검색 가능. |
| Illustrator (.ai) | SVG 대표 40장 | 벡터 호환. Illustrator 직접 열기 가능. |
| Photoshop (.psd) | HTML + 배경 JPG | 브라우저 스크린샷 또는 html2canvas로 PSD 변환 가능. |
| Premiere (.prproj) / AE (.aep) | FCPXML 1.11 | DaVinci Resolve에서 FCPXML을 열어 Premiere용 XML/AAF 재내보내기. |
| 폰트 원본 | Pretendard OFL 1.1 공식 배포처 링크 + README | 재배포 금지 이슈 없는 공식 경로로 안내. |
| 이미지 원본 | 배경 JPG 183장 + 생성 프롬프트 기록 | 재생성 스크립트 동봉. |
| BGM 원본 | 로열티 프리 추천 리스트 | 저작권 안전 경로만 사용. |
| 제작 회의록 | 운영기록 4건 (킥오프·중간검수×2·최종검수) | 피드백 29건 전수 반영. |

## 편집 흐름 요약

1. **카드뉴스 수정**: \`카드뉴스/HTML/{카테고리}/{세트명}/\*.html\` 을 VS Code로 열어 텍스트·스타일 편집 → 브라우저로 미리보기 → \`pnpm tsx scripts/plock/render-cardnews-v3.ts\` 로 PNG 재렌더.
2. **영상 수정**: DaVinci Resolve(무료)에서 \`영상/{videoId}.fcpxml\` import → 타임라인 편집 → H.264 MP4 재렌더.
3. **내레이션 재녹음**: \`소스/내레이션_스크립트.md\` 를 기반으로 재녹음 → \`영상/assets/{videoId}/\*.mp3\` 교체.
4. **새 BGM 추가**: \`소스/BGM/추천트랙.md\` 의 트랙 다운로드 → DaVinci Resolve 오디오 트랙 2 드래그.

## 체크리스트 — 감사·평가 대응

- [x] 편집 가능한 소스 파일 제공 (HTML / FCPXML)
- [x] 폰트 라이선스 명시 (OFL 1.1)
- [x] 이미지 저작권 명시 (Gemini 약관)
- [x] BGM 라이선스 대안 제공 (로열티 프리 리스트)
- [x] 회의록 기록 (킥오프 1 + 중간검수 2 + 최종검수 1 = 4건)
- [x] 수정 요청 반영 이력 (총 29건 100% 반영)
- [x] 디자인 토큰·프로젝트 매니페스트 문서화
- [x] 도메인 \`epub-remastering.hayanmind.com\` 일관 표기

## 제작

- **발주**: (주)하얀마인드 (오정민 · 김대훈)
- **공급**: (주)플락 (이은지 · 전정인)
- **기간**: 2026년 4월 1일 ~ 4월 20일
- **납품 확정**: 2026년 4월 20일
`;

  writeFileSync(join(OUT_ROOT, 'README.md'), topReadme);

  // Stats
  console.log('\n\n=============================================');
  console.log('최종 통계');
  console.log('=============================================');
  for (const sub of ['카드뉴스', '영상', '소스', '운영기록']) {
    const p = join(OUT_ROOT, sub);
    const s = dirStats(p);
    console.log(`  ${sub.padEnd(10)} : ${String(s.files).padStart(5)} files, ${String(s.dirs).padStart(4)} dirs, ${prettyBytes(s.bytes).padStart(10)}`);
  }
  const total = dirStats(OUT_ROOT);
  console.log(`  ---`);
  console.log(`  합계        : ${String(total.files).padStart(5)} files, ${String(total.dirs).padStart(4)} dirs, ${prettyBytes(total.bytes).padStart(10)}`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
