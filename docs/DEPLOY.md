# Vercel 배포 가이드

## 사전 요구사항

- [Vercel](https://vercel.com) 계정
- GitHub 리포지토리 연결: `git@github.com:hayanmind/repub.git`

## 배포 설정

### 1. Vercel 프로젝트 생성

1. Vercel 대시보드에서 "New Project" 클릭
2. GitHub 리포지토리 `hayanmind/repub` 선택
3. 설정:
   - **Framework Preset**: Next.js
   - **Root Directory**: `packages/web`
   - **Build Command**: (자동 감지 — `vercel.json` 사용)
   - **Install Command**: (자동 감지 — `vercel.json` 사용)

### 2. 환경 변수 (선택사항)

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `NEXT_PUBLIC_API_URL` | 외부 API 서버 URL (설정하지 않으면 내장 API 사용) | _(빈 문자열)_ |

> **참고**: Vercel 배포 시 별도의 API 서버 없이 Next.js API Routes로 모든 백엔드 기능이 제공됩니다.

### 3. 배포

```bash
# Vercel CLI로 배포
npx vercel --prod

# 또는 Git push 시 자동 배포 (Vercel 연동 후)
git push origin main
```

## 아키텍처

### 로컬 개발
```
[Next.js :3000] → [Express API :3001] → [Core Engine]
```
- `NEXT_PUBLIC_API_URL=http://localhost:3001` 설정
- `pnpm dev:api` + `pnpm dev` 실행

### Vercel 배포
```
[Next.js + API Routes] → [Core Engine (serverless)]
```
- 별도 API 서버 불필요
- Next.js API Routes가 모든 백엔드 기능 처리
- 인메모리 스토리지 (데모용)

## 제한사항

- 서버리스 환경의 인메모리 스토리지는 콜드 스타트 시 초기화됩니다
- 파일 업로드는 메모리에 저장되며, 함수 인스턴스가 종료되면 소실됩니다
- 프로덕션 환경에서는 외부 데이터베이스와 오브젝트 스토리지를 사용해야 합니다
- 변환 파이프라인은 시간 기반 시뮬레이션으로 동작합니다 (실제 ePub 변환은 Core 엔진 연동 필요)

## 로컬에서 Vercel 배포 테스트

```bash
# Vercel CLI 설치
npm i -g vercel

# 로컬 프리뷰
cd packages/web
vercel dev
```
