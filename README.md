# RePub — AI 기반 ePub 2.0 → 3.0 리마스터링 라이브러리

[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D9-orange)](https://pnpm.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/hayanmind/repub/actions/workflows/ci.yml/badge.svg)](https://github.com/hayanmind/repub/actions/workflows/ci.yml)

> **Re-imagined ePub. AI가 다시 짓는 전자책.**
>
> 구형 ePub 2.0 전자책을 최신 국제표준 **ePub 3.0 인터랙티브 콘텐츠**로 자동 변환하는 오픈소스 라이브러리입니다. 라이브러리(`@hayanmind/repub-core`)와 Sigil 편집기 플러그인(`ePubRemaster`)으로 구성됩니다.

## 📦 구성

```
repub/
├── packages/
│   ├── core/              # ePub 2.0 → 3.0 변환 엔진 + CLI (epub-remaster)
│   └── sigil-plugin/      # Sigil 편집기 Python 플러그인 (ePubRemaster)
├── fixtures/              # 테스트용 ePub 샘플 (3종 자체 + 4종 공개 도메인)
├── docs/                  # 기술 문서
│   ├── README.md          # 라이브러리 사용 가이드
│   ├── API.md             # 프로그래매틱 API 명세
│   ├── ARCHITECTURE.md    # 아키텍처 설계 문서
│   ├── FAQ.md             # 자주 묻는 질문
│   └── SIGIL-INTEGRATION.md # Sigil 플러그인 연동 분석
├── CLAUDE.md              # 개발 가이드라인
├── CONTRIBUTING.md        # 기여 가이드
└── LICENSE                # MIT
```

## ✨ 주요 기능

| 기능 | 설명 |
|------|------|
| **ePub 2.0 자동 파싱** | OPF/NCX/XHTML 구조 분석, 메타데이터 추출, 인코딩 자동 복구, 10종 핵심 오류 패턴 자동 검출 |
| **AI 콘텐츠 재구성** | 시맨틱 태그(h1~h6, figcaption, blockquote 등) 자동 부여, 스타일 매핑, 불필요 태그 정리 |
| **인터랙티브 요소** | 퀴즈 자동 생성, TTS 음성 변환, SMIL 미디어 오버레이 자동 싱크, 용어 팝업, AI 이미지 추천, AI 튜터 |
| **ePub 3.0 변환** | HTML5/CSS3/JS 기반 자동 패키징, ePubCheck 자동 검증 |
| **접근성 자동 적용** | KWCAG 2.1 AA, EPUB Accessibility 1.1, 이미지 alt 텍스트 자동 생성, 읽기 순서 최적화 |
| **Sigil 플러그인** | 출판사 편집자가 기존 워크플로우 유지하며 변환 가능 (API/Local 듀얼 모드) |

## 🚀 빠른 시작

### 요구사항

- **Node.js** 20 이상
- **pnpm** 9 이상 (`npm install -g pnpm`)

### 설치 및 빌드

```bash
git clone https://github.com/hayanmind/repub.git
cd repub
pnpm install
pnpm build
```

### CLI 사용

```bash
# 변환
npx epub-remaster convert input.epub -o output.epub

# 검증만
npx epub-remaster validate input.epub

# 메타데이터만 출력
npx epub-remaster info input.epub --format json
```

### 라이브러리로 사용

```typescript
import { processEpub } from '@hayanmind/repub-core';

const result = await processEpub('./input.epub', {
  output: './output.epub',
  enableQuiz: true,
  enableTTS: true,
  enableAccessibility: true,
});

console.log(`변환 성공: ${result.success}`);
console.log(`ePubCheck 통과: ${result.report.epubcheck.passed}`);
```

## 🧪 Mock 모드

API 키 없이도 전체 기능을 테스트할 수 있습니다. 환경 변수에 API 키가 없으면 자동으로 Mock 모드로 동작하여 데모용 결과를 생성합니다.

API 키를 설정하려면 `.env` 파일에 추가:
- `GEMINI_API_KEY` (메인 LLM, 권장)
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` (선택 LLM)
- `ELEVENLABS_API_KEY` (TTS, 선택)
- `STABILITY_API_KEY` (이미지 생성, 선택)

## 🧰 Sigil 플러그인 사용

`packages/sigil-plugin/` 디렉토리의 `ePubRemaster_v1.0.0.zip`을 Sigil 편집기에 import하면 됩니다. 자세한 설치 가이드는 `packages/sigil-plugin/README.md` 참조.

## 🛠 개발

```bash
pnpm install            # 의존성 설치
pnpm build              # 모든 패키지 빌드
pnpm test               # 단위·통합 테스트 (60+ 케이스)
pnpm lint               # 린트
pnpm clean              # 빌드 산출물 삭제
```

## 📚 문서

- [`docs/README.md`](docs/README.md) — 사용 가이드
- [`docs/API.md`](docs/API.md) — 프로그래매틱 API 명세
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — 아키텍처 설계 문서
- [`docs/FAQ.md`](docs/FAQ.md) — 자주 묻는 질문
- [`docs/SIGIL-INTEGRATION.md`](docs/SIGIL-INTEGRATION.md) — Sigil 플러그인 연동
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — 기여 가이드

## 🌐 라이브 데모 / 서비스

본 라이브러리를 활용한 SaaS 서비스 (별도 운영):
- **RePub SaaS**: https://repub.hayanmind.com
- 서비스 코드는 별도 비공개 리포 (`hayanmind/repub-app`) 에서 관리됩니다.

## 🏛 사업 배경

본 프로젝트는 **2025년 한국출판문화산업진흥원 출판콘텐츠 기술개발 지원 사업**의 결과물로, **(주)하얀마인드**가 단독 주관 개발하였습니다. 사업 종료 후 핵심 모듈을 MIT 오픈소스로 공개합니다.

- 사업 문서·외주 산출물·정부 평가 자료: [`hayanmind/gov-epub-2026`](https://github.com/hayanmind/gov-epub-2026) (비공개)

## 📜 라이선스

[MIT License](LICENSE) © 2025-2026 ㈜하얀마인드 (Hayanmind Inc.)

## 🤝 기여

[CONTRIBUTING.md](CONTRIBUTING.md)를 참조하세요. 이슈와 PR을 환영합니다.
