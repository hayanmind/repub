# ePub 리마스터링 도구

AI 기반 ePub 2.0 → 3.0 인터랙티브 리마스터링 시스템

[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D9-orange)](https://pnpm.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/hayanmind/repub/actions/workflows/ci.yml/badge.svg)](https://github.com/hayanmind/repub/actions/workflows/ci.yml)

> **📁 정부지원사업 내부 문서는 별도 리포에서 관리**
> 사업계획서, 월간보고, 외주 용역 서류 등 기밀 문서는 [`hayanmind/gov-epub-2026`](https://github.com/hayanmind/gov-epub-2026) (Internal) 에서 관리됩니다.
> 본 리포는 **소스코드 전용**이며 MIT 오픈소스로 공개됩니다.

## 소개

구형 ePub 2.0 전자책을 최신 국제표준 **ePub 3.0 인터랙티브 콘텐츠**로 자동 변환하는 시스템입니다.

### 주요 기능

| 기능 | 설명 |
|------|------|
| **ePub 2.0 자동 파싱** | OPF/NCX/XHTML 구조 분석, 메타데이터 추출, 인코딩 자동 복구 |
| **AI 콘텐츠 재구성** | 시맨틱 태그 자동 부여, 스타일 매핑, 불필요 태그 정리 |
| **인터랙티브 요소** | 퀴즈 자동 생성, TTS 음성 변환, 용어 팝업, AI 이미지 추천 |
| **ePub 3.0 변환** | HTML5/CSS3/JS 기반 패키징, ePubCheck 자동 검증 |
| **접근성 자동 적용** | KWCAG 2.1, EPUB Accessibility 1.1 표준 준수 |
| **웹 대시보드** | 파일 업로드, 변환 모니터링, Before/After 비교, KPI 리포트 |

### Mock 모드

**API 키 없이도 전체 기능을 시연할 수 있습니다.** 환경 변수에 API 키가 없으면 자동으로 Mock 모드로 동작하여 데모용 결과를 생성합니다.

## 빠른 시작

### 요구사항

- **Node.js** 20 이상
- **pnpm** 9 이상 (`npm install -g pnpm`)

### 설치 및 실행

```bash
# 클론 및 의존성 설치
git clone git@github.com:hayanmind/repub.git
cd repub
pnpm install

# (선택) API 키 설정 — 없으면 Mock 모드
cp .env.example .env

# API 서버 실행 (포트 3001)
pnpm dev:api

# 웹 대시보드 실행 (포트 3000) — 별도 터미널
pnpm dev
```

브라우저에서 `http://localhost:3000` 접속.

### Docker로 실행

```bash
docker compose up
```

포트 3000 (웹), 3001 (API)이 자동 매핑됩니다.

### Core 라이브러리 단독 사용

```typescript
import { processEpub } from '@gov-epub/core';
import { readFileSync } from 'fs';

const input = readFileSync('book.epub');
const result = await processEpub(input, {
  enableQuiz: true,
  enableTts: false,
  enableSummary: true,
  enableImageGen: false,
  templateId: 'default',
  cssTheme: 'light',
});

console.log(`변환 완료: ${result.stats.chapterCount}개 챕터`);
console.log(`검증 통과: ${result.report.epubcheck.passed}`);
```

## 프로젝트 구조

```
repub/
├── packages/
│   ├── core/           # 핵심 변환 엔진 (독립 라이브러리)
│   │   └── src/
│   │       ├── parser/         # ePub 2.0 파싱
│   │       ├── restructurer/   # AI 기반 재구성
│   │       ├── interaction/    # 퀴즈/TTS/이미지 생성
│   │       ├── converter/      # ePub 3.0 변환/패키징
│   │       ├── accessibility/  # 접근성 자동 적용
│   │       └── validator/      # ePubCheck 연동
│   ├── api/            # REST API 서버 (Express, 포트 3001)
│   └── web/            # 웹 대시보드 (Next.js, 포트 3000)
├── fixtures/           # 테스트용 ePub 2.0 샘플 (3종)
├── docs/               # 기술 문서
│   ├── ARCHITECTURE.md # 아키텍처 설계 문서
│   ├── API.md          # REST API 명세서
│   ├── FAQ.md          # 자주 묻는 질문
│   ├── SIGIL-INTEGRATION.md  # Sigil 플러그인 연동 분석
│   └── FINAL_REPORT.md # 결과보고서
├── .github/workflows/  # GitHub Actions CI/CD
├── CLAUDE.md           # 프로젝트 기술 참조 (소스 문서 기반)
├── CONTRIBUTING.md     # 기여 가이드
├── Dockerfile          # Docker 빌드 (dev/production)
└── docker-compose.yml  # 로컬 개발 환경
```

## 기술 스택

| 구분 | 기술 |
|------|------|
| **Language** | TypeScript (strict, ESM) |
| **Frontend** | Next.js 16 + Tailwind CSS |
| **Backend** | Express + Node.js |
| **AI** | OpenAI GPT-4, ElevenLabs TTS (Mock 모드 지원) |
| **ePub** | JSZip, htmlparser2, ePubCheck |
| **Test** | Vitest (5 Suites, 60 Tests) |
| **Build** | tsup, pnpm workspace |
| **CI/CD** | GitHub Actions |
| **Deploy** | Vercel (서버리스) |
| **Container** | Docker, Docker Compose |

## 테스트용 ePub 샘플

`fixtures/` 디렉토리에 3종의 테스트 ePub이 포함되어 있습니다:

| 파일 | 장르 | 특징 |
|------|------|------|
| `literature-novel.epub` | 소설 | 텍스트 중심, 3개 챕터 |
| `education-science.epub` | 교재 | 이미지+텍스트 혼합, 표/목록 |
| `children-phonics.epub` | 유아동 | 이미지 중심, 파닉스 학습 |

`fixtures/samples/` 디렉토리에 공개 도메인 ePub 샘플도 포함:

| 파일 | 저자 | 언어 | 출처 |
|------|------|------|------|
| `alice-in-wonderland.epub` | Lewis Carroll | EN | Project Gutenberg |
| `pride-and-prejudice.epub` | Jane Austen | EN | Project Gutenberg |
| `jekyll-and-hyde.epub` | R.L. Stevenson | EN | Project Gutenberg |
| `lucky-day.epub` | 현진건 | KO | 위키문헌 (생성) |

## 스크립트

```bash
pnpm dev          # 웹 대시보드 개발 서버
pnpm dev:api      # API 서버 개발 서버
pnpm build        # 전체 패키지 빌드
pnpm test         # 전체 테스트 실행
pnpm clean        # 빌드 결과물 삭제
```

## 문서

- [아키텍처 문서](docs/ARCHITECTURE.md) — 설계 결정, 데이터 흐름, 확장 가이드
- [API 명세서](docs/API.md) — REST API 엔드포인트
- [기여 가이드](CONTRIBUTING.md) — 개발 환경, 코딩 컨벤션, 확장 포인트
- [Sigil 연동 분석](docs/SIGIL-INTEGRATION.md) — Sigil ePub 에디터 플러그인 연동
- [FAQ](docs/FAQ.md) — 자주 묻는 질문
- [Vercel 배포 가이드](docs/DEPLOY.md) — Vercel 배포 설정
- [결과보고서](docs/FINAL_REPORT.md) — 사업 결과보고서

## CI/CD

GitHub Actions로 Push/PR 시 자동으로 빌드, 테스트, 타입체크가 실행됩니다.

```
ci.yml
├── build-and-test    # pnpm install → core/api/web 빌드 → 테스트 실행
└── typecheck         # TypeScript 타입 검증
```

## 준수 표준

- **KWCAG 2.1** — 한국형 웹 콘텐츠 접근성 지침
- **EPUB Accessibility 1.1** — W3C ePub 접근성 표준
- **WCAG 2.1 AA** — 웹 대시보드 접근성
- **ePub 3.0 (W3C)** — 출력 형식 표준

## 개발

**(주)하얀마인드**

이 프로젝트는 **한국출판문화산업진흥원 2025년 출판콘텐츠 기술개발 지원 사업**의 지원을 받아 수행되었습니다.

## 라이선스

MIT License
