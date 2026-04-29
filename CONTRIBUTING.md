# Contributing Guide / 기여 가이드

이 프로젝트에 기여해 주셔서 감사합니다. 아래 가이드를 따라 주세요.

## 프로젝트 구조 이해

```
repub/
├── packages/
│   ├── core/           # 핵심 변환 엔진 + CLI (epub-remaster)
│   │   └── src/
│   │       ├── parser/         # [Stage 1] ePub 2.0 파싱
│   │       ├── restructurer/   # [Stage 2] AI 기반 재구성
│   │       ├── interaction/    # [Stage 3] 퀴즈/TTS/이미지 생성
│   │       ├── converter/      # [Stage 4] ePub 3.0 변환/패키징
│   │       ├── accessibility/  # [Stage 4.5] 접근성 자동 적용
│   │       ├── validator/      # [Stage 5] ePubCheck 연동
│   │       ├── cli.ts          # epub-remaster CLI 진입점
│   │       └── __tests__/      # 테스트 (5 Suites, 60 Tests)
│   └── sigil-plugin/   # Sigil 편집기 Python 플러그인 (ePubRemaster)
├── fixtures/           # 테스트용 ePub 샘플 (3종 자체 + 4종 공개 도메인)
│   └── samples/        # 공개 도메인 샘플
├── docs/               # 기술 문서 (5건: README/API/ARCHITECTURE/FAQ/SIGIL-INTEGRATION)
└── CONTRIBUTING.md     # 이 문서

> 참고: 본 라이브러리를 활용한 SaaS 서비스(Next.js + Clerk + Neon + Vercel Blob)는 별도 비공개 저장소(`hayanmind/repub-app`)에서 관리됩니다.
```

---

## 개발 환경 설정

### 요구사항

- **Node.js** 20 이상
- **pnpm** 9 이상 (`npm install -g pnpm`)
- **Git**

### 초기 설정

```bash
# 1. 저장소 클론
git clone https://github.com/hayanmind/repub.git
cd repub

# 2. 의존성 설치 (모든 패키지 한 번에 설치)
pnpm install

# 3. 환경 변수 설정 (선택 -- 없으면 Mock 모드로 동작)
cp .env.example .env
# .env 파일에서 OPENAI_API_KEY 등을 설정하면 실제 AI API를 사용합니다.
# 설정하지 않아도 Mock 모드로 전체 기능을 테스트할 수 있습니다.
```

### 개발 서버 실행

두 개의 터미널을 사용합니다:

```bash
# 터미널 1: API 서버 (포트 3001)
pnpm dev:api

# 터미널 2: 웹 대시보드 (포트 3000)
pnpm dev
```

브라우저에서 http://localhost:3000 접속하여 대시보드를 확인합니다.
API 서버 상태는 http://localhost:3001/api/health 에서 확인할 수 있습니다.

### Core 패키지 개발

```bash
cd packages/core
pnpm dev              # watch 모드 (변경 시 자동 빌드)
pnpm build            # 프로덕션 빌드
pnpm test             # 테스트 실행 (5 Suites, 60 Tests)
```

---

## 코딩 컨벤션

### TypeScript

- `strict: true` 필수
- ESM (`type: "module"`)
- 인터페이스보다 타입 alias 선호 (간단한 경우)
- 명시적 반환 타입 권장
- `any` 사용 금지 -- 필요한 경우 `unknown`으로 대체
- 미사용 import 금지

### 프론트엔드 API 호출

모든 API 호출은 `packages/web/src/lib/api.ts`의 함수를 통해 수행합니다. 직접 `fetch()`를 호출하거나 URL을 하드코딩하지 마세요.

```typescript
// 올바른 예
import { getJobStatus, getDownloadUrl } from '@/lib/api';
const job = await getJobStatus(jobId);

// 잘못된 예 -- 하드코딩 금지
const res = await fetch('http://localhost:3001/api/jobs/' + jobId);
```

### 스타일

- Tailwind CSS v4 유틸리티 클래스 사용
- 커스텀 CSS 최소화
- 반응형 디자인 (sm/md/lg 브레이크포인트 활용)

### 커밋 메시지

[Conventional Commits](https://www.conventionalcommits.org/) 준수:

```
feat: 퀴즈 자동 생성기 구현
fix: OPF 파서 인코딩 깨짐 복구
docs: API 명세서 업데이트
test: 파서 단위 테스트 추가
chore: 의존성 업데이트
refactor: 변환 파이프라인 모듈 분리
style: 코드 포매팅 수정
```

### 브랜치 전략

- `main`: 안정 릴리스
- `develop`: 개발 통합
- `feature/*`: 기능 개발 (예: `feature/tts-sync`)
- `fix/*`: 버그 수정

```bash
# 새 기능 개발
git checkout -b feature/my-feature develop

# 작업 완료 후
git push origin feature/my-feature
# GitHub에서 Pull Request 생성 (develop 브랜치로)
```

---

## 테스트

### 테스트 실행

```bash
# 전체 테스트 (모든 패키지)
pnpm test

# Core 패키지만 테스트
cd packages/core && pnpm test

# 특정 테스트 파일만 실행
cd packages/core && npx vitest run src/__tests__/parser.test.ts

# Watch 모드 (파일 변경 시 자동 재실행)
cd packages/core && npx vitest
```

### 테스트 구성

| Suite | 파일 | 테스트 수 | 범위 |
|-------|------|----------|------|
| Parser | `parser.test.ts` | 15개 | OPF/NCX/HTML 파서 |
| Converter | `converter.test.ts` | 12개 | HTML5/CSS/OPF/Nav 변환 |
| Accessibility | `accessibility.test.ts` | 10개 | KWCAG 2.1 태그 삽입 |
| Validator | `validator.test.ts` | 11개 | ePubCheck, KPI 측정 |
| Pipeline | `pipeline.test.ts` | 12개 | 전체 파이프라인 통합 |

### 테스트 작성 규칙

- `packages/core/src/__tests__/` 디렉토리에 `*.test.ts` 파일로 작성
- **Vitest** 사용 (`describe`, `it`, `expect`)
- Mock 모드와 실제 API 모드 모두 테스트 가능하도록 구성
- 새로운 기능 추가 시 반드시 해당 기능의 테스트도 함께 작성

### 테스트용 ePub 샘플

`fixtures/` 디렉토리에 3종의 테스트 ePub이 준비되어 있습니다:

| 파일 | 장르 | 특징 |
|------|------|------|
| `literature-novel.epub` | 소설 | 텍스트 중심, 3개 챕터 |
| `education-science.epub` | 교재 | 이미지+텍스트 혼합, 표/목록 |
| `children-phonics.epub` | 유아동 | 이미지 중심, 파닉스 학습 |

`fixtures/samples/` 디렉토리에 공개 도메인 ePub 4종도 포함되어 있습니다.

새 샘플을 추가하려면 `fixtures/create-samples.ts`를 수정하고 실행합니다:

```bash
npx tsx fixtures/create-samples.ts
```

---

## 주요 확장 포인트

### 새로운 인터랙티브 요소 추가

`packages/core/src/interaction/` 디렉토리에 새 모듈을 추가합니다.

```typescript
// packages/core/src/interaction/my-feature/index.ts
import type { AiConfig } from '../types.js';

export interface MyFeatureResult {
  // 결과 타입 정의
}

export async function generateMyFeature(
  chapterText: string,
  config: AiConfig
): Promise<MyFeatureResult> {
  if (config.useMock) {
    return mockResult(); // Mock 데이터 반환
  }
  // 실제 API 호출 로직
}
```

그리고 `interaction/index.ts`의 `generateAiContent()`에 등록합니다.

### 새로운 ePub 검증 규칙 추가

`packages/core/src/validator/index.ts`에 검증 함수를 추가합니다.

### 새로운 접근성 규칙 추가

`packages/core/src/accessibility/index.ts`에 접근성 태그 삽입 로직을 추가합니다.

### 새로운 API 엔드포인트 추가

1. `packages/api/src/routes/`에 새 라우트 파일을 생성
2. `server.ts`에 라우터를 import하고 등록

```typescript
// packages/api/src/routes/my-route.ts
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';

export const myRouter = Router();

myRouter.get('/my-endpoint', (req: Request, res: Response) => {
  res.json({ message: 'Hello!' });
});
```

### 새로운 프론트엔드 페이지 추가

1. `packages/web/src/app/<page-name>/page.tsx` 생성 (Next.js App Router)
2. `lib/api.ts`에 필요한 API 함수 추가
3. `components/layout/sidebar.tsx`에 네비게이션 링크 추가

---

## 의존성 관리

- pnpm workspace를 사용한 모노레포
- `@gov-epub/core`는 `api`와 `web`에서 `workspace:*`로 참조
- 새 의존성 추가 시 해당 패키지 디렉토리에서 `pnpm add <pkg>`

```bash
# Core 패키지에 의존성 추가
cd packages/core && pnpm add some-package

# 개발 의존성 추가
cd packages/core && pnpm add -D some-dev-package

# 루트에 개발 의존성 추가
pnpm add -D some-tool -w
```

---

## 배포

### Core 라이브러리

```bash
cd packages/core && pnpm build
# dist/ 디렉토리에 ESM + CJS + DTS 생성
```

### API 서버

```bash
cd packages/api && pnpm build && node dist/server.js
```

### 웹 대시보드

```bash
cd packages/web && pnpm build && pnpm start
```

---

## Pull Request 체크리스트

PR을 제출하기 전에 다음을 확인해 주세요:

- [ ] `pnpm test` 전체 테스트 통과
- [ ] `pnpm build` 빌드 성공
- [ ] 새 기능에 대한 테스트 추가
- [ ] TypeScript 에러 없음 (`strict: true`)
- [ ] Conventional Commits 형식의 커밋 메시지
- [ ] 하드코딩된 URL 없음 (`api.ts`의 함수 사용)
- [ ] `console.log` 디버깅 코드 제거

---

## 문의

이슈 트래커를 통해 버그 리포트, 기능 요청을 제출해 주세요.
