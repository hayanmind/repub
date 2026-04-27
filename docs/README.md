# ePub 3.0 인터랙티브 리마스터링 도구

AI 기반 ePub 2.0 → 3.0 자동 변환 시스템

> **[Live Demo](https://hayanmind.github.io/repub/)** — API 서버 없이 데모 모드로 전체 UI를 체험할 수 있습니다.

---

## 개요

구형 ePub 2.0 이하 전자책을 최신 국제표준 ePub 3.0 인터랙티브 콘텐츠로 자동 변환합니다. ePub 파일을 업로드하면 AI가 구조 분석, 시맨틱 태깅, 접근성 적용, 인터랙티브 요소 삽입, ePub 3.0 패키징까지 전 과정을 자동으로 수행합니다.

### 주요 기능

| 기능 | 설명 |
|------|------|
| **ePub 2.0 자동 파싱** | HTML/XML/OPF/NCX 구조 분석, 메타데이터 추출, 10종 오류 패턴 자동 감지 |
| **AI 콘텐츠 재구성** | LLM 기반 시맨틱 태그 자동 부여, 챕터 구조 재편성, 불필요 태그 정리, CSS 자동 생성 |
| **인터랙티브 요소** | 퀴즈 자동 생성, TTS 음성 변환 + SMIL 미디어 오버레이, 용어 팝업, AI 이미지 추천 |
| **ePub 3.0 변환** | HTML5/CSS3/JS 기반 패키징, ePubCheck 자동 검증, OPF/Nav 문서 자동 생성 |
| **접근성 자동 적용** | KWCAG 2.1, EPUB Accessibility 1.1, 이미지 alt 텍스트 자동 생성, 읽기 순서 최적화 |
| **웹 대시보드** | 파일 업로드, 실시간 변환 모니터링, Before/After 비교, KPI 리포트, 설정 관리 |

### 데모 모드

API 키나 백엔드 서버 없이도 **전체 UI와 변환 흐름을 체험**할 수 있습니다:

- 대시보드의 **"데모 시작"** 버튼 클릭 → 자동으로 업로드 → 변환 → 미리보기 흐름 진행
- 데모 콘텐츠: 현진건의 "운수 좋은 날" (1924, 공개 도메인 한국 문학)
- AI 변환 구간 하이라이팅, 퀴즈, TTS 파형 시각화, Before/After 비교 등 모든 기능 체험 가능

---

## 빠른 시작

### 요구사항

- Node.js 20+
- pnpm 9+

### 설치 및 실행

```bash
git clone https://github.com/hayanmind/repub.git
cd repub
pnpm install

# 웹 대시보드만 (데모 모드, 포트 3000)
pnpm dev

# 풀 스택 (API 서버 + 웹 대시보드)
pnpm dev:api   # 터미널 1: API 서버 (포트 3001)
pnpm dev        # 터미널 2: 웹 대시보드 (포트 3000)
```

### Docker

```bash
docker compose up    # 개발 환경 (3000 + 3001)
```

---

## 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                 Web Dashboard (Next.js 16)               │
│   Dashboard → Upload → Convert → Preview → Report       │
│   Settings → Guide                                       │
└─────────────┬───────────────────────────────┬────────────┘
              │ REST API                      │
              ▼                               │
┌─────────────────────────────────────────────────────────┐
│               API Server (Express / Vercel)              │
│   16 endpoints: upload, convert, jobs, preview,          │
│   report, download, samples, auth, settings, health      │
└─────────────┬───────────────────────────────────────────┘
              │ processEpub()
              ▼
┌─────────────────────────────────────────────────────────┐
│               Core Engine (@gov-epub/core)                │
│                                                           │
│  Parser ──▶ Restructurer ──▶ Interaction ──▶ Converter   │
│  (ePub2)    (Semantic)       (Quiz/TTS)     (ePub 3.0)   │
│                                                           │
│  Validator ◀── Accessibility                              │
│  (ePubCheck)   (KWCAG 2.1)                               │
└─────────────────────────────────────────────────────────┘
              │
              ▼ (선택적, Mock 모드 지원)
┌─────────────────────────────────────────────────────────┐
│   External AI APIs                                       │
│   OpenAI GPT-4 / ElevenLabs TTS / Stability AI          │
└─────────────────────────────────────────────────────────┘
```

### 변환 파이프라인 (5단계)

1. **입력/분석** — ePub 2.0 업로드 → MIME 검증 → ZIP 해제 → OPF/NCX/XHTML 파싱 → 오류 감지
2. **AI 재구성** — LLM 기반 구조 분석 → 시맨틱 태그 부여 → 챕터 재편성 → CSS 생성
3. **인터랙션 삽입** — 퀴즈 생성 → TTS 음성 변환 → 미디어 오버레이 → 용어 팝업
4. **ePub 3.0 변환** — HTML5 변환 → 접근성 태그 → OPF/Nav 생성 → 패키징 → 검증
5. **배포** — 미리보기 → 사용자 피드백 → 최종 패키징 → 다운로드

---

## 프로젝트 구조

```
repub/
├── packages/
│   ├── core/                  # 핵심 변환 엔진 (독립 라이브러리)
│   │   ├── src/
│   │   │   ├── index.ts       # processEpub() — 전체 파이프라인 진입점
│   │   │   ├── types.ts       # 공유 타입 정의
│   │   │   ├── parser/        # ePub 2.0 파서 (ZIP, OPF, NCX, XHTML)
│   │   │   ├── converter/     # ePub 3.0 변환 + 패키징
│   │   │   ├── accessibility/ # KWCAG 2.1 접근성 자동 적용
│   │   │   ├── validator/     # 구조/접근성/KPI 검증
│   │   │   └── interaction/   # AI 인터랙티브 요소
│   │   │       ├── ai-config.ts   # Mock/Real 모드 자동 감지
│   │   │       ├── quiz/      # GPT-4 기반 퀴즈 생성
│   │   │       ├── tts/       # ElevenLabs TTS + SMIL
│   │   │       ├── image/     # AI 이미지 추천/생성
│   │   │       └── tutor/     # AI 튜터 채팅
│   │   └── package.json
│   ├── api/                   # REST API 서버 (Express)
│   │   ├── src/
│   │   │   ├── routes/        # 16 API 엔드포인트
│   │   │   ├── services/      # 비즈니스 로직
│   │   │   └── middleware/    # JWT 인증, 에러 핸들링
│   │   └── package.json
│   └── web/                   # 웹 대시보드 (Next.js 16)
│       ├── src/
│       │   ├── app/           # App Router 페이지 (7개)
│       │   │   ├── page.tsx       # 메인 대시보드
│       │   │   ├── upload/        # ePub 업로드
│       │   │   ├── convert/       # 변환 진행 상황
│       │   │   ├── preview/       # Before/After 미리보기
│       │   │   ├── report/        # KPI 리포트
│       │   │   ├── settings/      # API 키 및 설정
│       │   │   └── guide/         # 사용 가이드
│       │   ├── components/ui/ # 공용 UI 컴포넌트
│       │   └── lib/
│       │       ├── api.ts         # API 호출 중앙화
│       │       ├── demo-data.ts   # 한국 문학 데모 데이터
│       │       └── demo-flow.ts   # 원클릭 데모 오케스트레이터
│       └── package.json
├── fixtures/                  # 테스트용 ePub 샘플
│   └── samples/               # 공개 도메인 4종
├── docs/                      # 기술 문서
│   ├── ARCHITECTURE.md        # 시스템 아키텍처 상세
│   ├── API.md                 # REST API 전체 명세 (16 엔드포인트)
│   ├── DEPLOY.md              # Vercel 배포 가이드
│   ├── FAQ.md                 # 자주 묻는 질문
│   ├── SIGIL-INTEGRATION.md   # Sigil 파서 통합 가이드
│   └── FINAL_REPORT.md        # 최종 보고서
├── .github/workflows/
│   ├── ci.yml                 # CI: 빌드 + 테스트 + 타입체크
│   └── pages.yml              # GitHub Pages 자동 배포
├── docker-compose.yml         # Docker 개발 환경
├── CLAUDE.md                  # 프로젝트 요구사항 전체 명세
└── LICENSE                    # MIT License
```

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS v4, TypeScript |
| **Backend** | Express 4, Node.js 20+, TypeScript |
| **Core Engine** | JSZip, htmlparser2, dom-serializer, css-tree, chardet |
| **AI/LLM** | OpenAI GPT-4 (퀴즈/요약/구조 분석) |
| **TTS** | ElevenLabs API (음성 생성 + SMIL 미디어 오버레이) |
| **이미지** | Stability AI / OpenAI DALL-E |
| **ePub 뷰어** | epub.js |
| **테스트** | Vitest (60 tests / 5 suites) |
| **빌드** | tsup (core/api), Next.js (web), pnpm workspace |
| **CI/CD** | GitHub Actions, Docker |
| **배포** | GitHub Pages (데모) / Vercel (프로덕션) / Docker |

---

## 배포 옵션

### 1. GitHub Pages (데모 모드)

API 서버 없이 정적 빌드로 배포됩니다. `main` push 시 자동 배포.

- URL: `https://hayanmind.github.io/repub/`
- 모든 페이지가 데모 데이터로 동작

### 2. Vercel (프로덕션)

Next.js API Routes로 서버리스 백엔드를 포함합니다.

```bash
# Vercel CLI로 배포
npx vercel
```

자세한 설정은 [DEPLOY.md](./DEPLOY.md) 참조.

### 3. Docker

```bash
docker compose up              # 개발 환경
docker compose -f docker-compose.prod.yml up  # 프로덕션
```

### 4. 로컬 개발

```bash
pnpm install
pnpm dev:api   # Express API (포트 3001)
pnpm dev        # Next.js (포트 3000)
```

---

## AI API 키 설정

API 키가 없으면 자동으로 Mock 모드로 동작합니다. 실제 AI 기능을 사용하려면:

```bash
# .env 파일 생성
cp .env.example .env
```

| 환경 변수 | 서비스 | 용도 |
|-----------|--------|------|
| `OPENAI_API_KEY` | OpenAI GPT-4 | 퀴즈 생성, 챕터 요약, 구조 분석, 용어 설명 |
| `ELEVENLABS_API_KEY` | ElevenLabs | TTS 음성 생성 + 미디어 오버레이 |
| `STABILITY_API_KEY` | Stability AI | 맥락 기반 이미지 생성/추천 |
| `ANTHROPIC_API_KEY` | Anthropic Claude | (선택) 대체 LLM |

**Mock 모드**: API 키 없이도 전체 파이프라인이 동작합니다. 실제 AI 응답 대신 미리 준비된 데모 데이터를 사용합니다.

---

## 핵심 명령어

```bash
# 전체
pnpm install          # 의존성 설치
pnpm build            # 전체 빌드 (core → api → web)
pnpm test             # 전체 테스트
pnpm dev              # 웹 개발 서버
pnpm dev:api          # API 개발 서버
pnpm clean            # 빌드 산출물 삭제

# 개별 패키지
pnpm --filter @gov-epub/core run build
pnpm --filter @gov-epub/core run test
pnpm --filter @gov-epub/web run build

# 정적 빌드 (GitHub Pages)
STATIC_EXPORT=true pnpm --filter @gov-epub/web run build
```

---

## KPI 목표치

| # | KPI | 목표 |
|---|-----|------|
| 1 | ePubCheck 통과율 | ≥ 95% |
| 2 | 퀴즈 HTML 오류율 | ≤ 1% |
| 3 | 퀴즈 JSON 스키마 통과율 | ≥ 98% |
| 4 | TTS 텍스트 싱크 정확도 | ≥ 98% |
| 5 | TTS 무음 구간 비율 | ≤ 5% |
| 6 | KWCAG 접근성 충족율 | ≥ 90% |
| 7 | 인터랙션 요소 자동 포함 | ≥ 3종/권 |
| 8 | API 평균 응답시간 | ≤ 3초 |
| 9 | 시스템 가용률 | ≥ 99.5% |
| 10 | 자동 TC 통과율 | ≥ 90% |

---

## 준수 표준

| 표준 | 버전 | 적용 대상 |
|------|------|-----------|
| ePub 3.0 | Spec 3.2 | 변환 결과물 패키징 |
| KWCAG | 2.1 | ePub 콘텐츠 접근성 |
| EPUB Accessibility | 1.1 (W3C) | 접근성 메타데이터 |
| WCAG | 2.1 AA | 웹 대시보드 UI |
| HTML5 / CSS3 | Living Standard | 콘텐츠 마크업/스타일 |
| SMIL | 3.0 | TTS 미디어 오버레이 |

---

## 구현 현황

| 영역 | 상태 | 비고 |
|------|------|------|
| Core 엔진 (파서/변환/접근성/검증) | ✅ 완성 | 60 tests 전체 통과 |
| AI 인터랙션 (퀴즈/TTS/이미지/튜터) | ✅ 완성 | Mock + Real 모드 |
| Web UI (7 페이지 + 15 API Routes) | ✅ 완성 | Next.js 16, 프리미엄 UI |
| API 서버 (Express, 16 엔드포인트) | ✅ 완성 | 로컬 개발용 |
| 문서 (8건) | ✅ 완성 | README 외 7건 |
| GitHub Actions CI/CD | ✅ 완성 | 빌드 + 테스트 + 타입체크 |
| GitHub Pages 배포 | ✅ 완성 | 자동 배포 워크플로우 |
| Docker / Docker Compose | ✅ 완성 | dev/production |
| Vercel 배포 설정 | ✅ 완성 | 서버리스 API Routes |
| 프로덕션 DB (PostgreSQL) | ⬜ 미구현 | 현재 인메모리 |
| 작업 큐 (Redis/BullMQ) | ⬜ 미구현 | 시뮬레이션 |
| 클라우드 스토리지 (GCS/S3) | ⬜ 미구현 | 로컬 파일시스템 |
| 외부 ePubCheck CLI 연동 | ⬜ 미구현 | 내장 validator |

---

## 인수인계 참고사항

### 아키텍처 핵심 패턴

**듀얼 API 모드:**
- **로컬 개발**: Express 서버 (포트 3001) + Next.js (포트 3000)
- **Vercel 배포**: Next.js API Route Handlers (서버리스)
- 모든 API 호출은 `packages/web/src/lib/api.ts`에서 중앙화. `NEXT_PUBLIC_API_URL` 환경변수로 API 서버 주소 결정.

**Mock/Real AI 자동 전환:**
- `packages/core/src/interaction/ai-config.ts`에서 API 키 존재 여부 자동 감지
- 키 없음 → Mock 모드 (데모 결과 생성), 키 있음 → 실제 API 호출

**데모 폴백 패턴:**
- 웹 페이지에서 `try { API 호출 } catch { DEMO_DATA 사용 }` 패턴 일관 적용
- API 서버 미연결 시에도 프론트엔드 단독 데모 가능

### 기술적 주의사항

- **Buffer → Response**: Next.js Route Handler에서 `new Uint8Array(buffer)` 사용 필요
- **`dom-serializer`**: xmlMode에서 한국어가 `&#xHEX;` 엔티티로 인코딩됨 (알려진 이슈)
- **Vercel 빌드 순서**: core를 먼저 빌드해야 함 (`vercel.json`에 설정됨)
- **정적 빌드**: `STATIC_EXPORT=true` 시 API Routes 디렉토리 제거 필요 (dynamic routes 비호환)
- **`.ai-highlight` 스타일**: globals.css에서 정의 (AI 변환 구간 시각적 표시)

### 향후 작업

1. Vercel 실제 배포 (대시보드에서 프로젝트 생성)
2. 실제 AI API 연동 (API 키 설정 후 Mock → Real 전환)
3. 프로덕션 DB/스토리지 (PostgreSQL, GCS/S3)
4. 비동기 작업 큐 (BullMQ + Redis)
5. 외부 ePubCheck CLI / Ace by DAISY 연동
6. ePub 1,000권 대량 변환 실증 테스트
7. 출판사 FGI (사용성 인터뷰) 피드백 반영

---

## 관련 문서

- [ARCHITECTURE.md](./ARCHITECTURE.md) — 시스템 아키텍처 상세
- [API.md](./API.md) — REST API 전체 명세 (16 엔드포인트)
- [DEPLOY.md](./DEPLOY.md) — Vercel 배포 가이드
- [FAQ.md](./FAQ.md) — 자주 묻는 질문
- [SIGIL-INTEGRATION.md](./SIGIL-INTEGRATION.md) — Sigil 파서 통합 가이드
- [FINAL_REPORT.md](./FINAL_REPORT.md) — 최종 보고서

---

## 기여

이슈와 PR을 환영합니다.

1. Fork 후 `feature/*` 브랜치 생성
2. Conventional Commits 규칙 준수 (`feat:`, `fix:`, `docs:`, `test:`, `chore:`)
3. `pnpm test` 통과 확인 후 PR 제출

---

## 라이선스

[MIT License](../LICENSE)

---

## 지원 사업

한국출판문화산업진흥원 **2025년 출판콘텐츠 기술개발 지원** 사업
- 주관기관: (주)하얀마인드
- 사업기간: 2025.9 ~ 2026.6
