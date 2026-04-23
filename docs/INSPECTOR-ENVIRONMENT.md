# 검수인 시험 환경 준비 체크리스트

> **대상 독자**: (주)하얀마인드 내부 담당자
> **목적**: 외부 공인 시험기관의 검수인이 시험 당일 현장(또는 원격)에 도착했을 때, 준비 부족으로 지체되지 않도록 사전에 환경을 100% 완성해 두기 위한 체크리스트
> **관련 문서**:
> - `docs/TESTWORKS-INSPECTION-GUIDE.md` — 기관 의뢰 전체 절차
> - `docs/INSPECTOR-CHECKLIST.md` — 검수인 수동 확인 항목
> - `scripts/inspect-run.sh` — 검수인 원-쇼 실행 스크립트

---

## 1. 시험 환경 운영 모델

하얀마인드가 **시험용 전용 머신** 1대를 준비하고, 검수인은 해당 머신에서 **스크립트 실행 + 결과 확인**만 수행합니다. 검수인은 별도 환경 세팅을 하지 않으며, 개발용 머신/프로덕션 환경과 분리된 샌드박스에서 시험을 수행합니다.

| 역할 | 하얀마인드 | 검수인 |
|------|-----------|--------|
| 하드웨어 준비 | O | X |
| 소프트웨어 설치 | O | X |
| 네트워크/방화벽 설정 | O | X |
| API 키 세팅 | O | X |
| 저장소 clone | O | X |
| **스크립트 실행** | X | **O** |
| **결과 검증·스크린샷** | X | **O** |
| **성적서 작성** | X | **O** |

---

## 2. 하드웨어 요구사항

### 2.1 필수 사양

| 항목 | 최소 | 권장 |
|------|------|------|
| OS | macOS 14 (Sonoma) 또는 Ubuntu 22.04 LTS | macOS 15 (Sequoia) 또는 Ubuntu 24.04 LTS |
| CPU | Apple M1 / Intel 4코어 / x86 4코어 | Apple M2 Pro 이상 / Intel 8코어 이상 |
| 메모리 | 16 GB | 32 GB (대량 데이터셋 시험 시) |
| 스토리지 (여유 공간) | 20 GB | 50 GB |
| 디스플레이 | 1920x1080 | 2560x1440 이상 (스크린샷 가독성) |

### 2.2 머신 셋업 권장안

- **MacBook Pro 14" (M2 Pro, 32GB, 512GB)** 1대 — 기본 시험용
- **외장 모니터 + 키보드/마우스** — 검수인 작업 편의
- **프린터 접근성** — 체크리스트 인쇄용

---

## 3. 소프트웨어 설치 체크리스트

검수인 도착 **최소 24시간 전**에 아래를 모두 완료하십시오.

### 3.1 필수 소프트웨어

| # | 항목 | 버전 | 확인 명령 | 설치 확인 |
|---|------|------|-----------|-----------|
| 1 | Node.js | **≥ 20.0.0** (LTS) | `node -v` | ☐ |
| 2 | pnpm | **≥ 8.0.0** | `pnpm -v` | ☐ |
| 3 | Git | ≥ 2.40 | `git --version` | ☐ |
| 4 | Java (ePubCheck용) | ≥ 11 | `java -version` | ☐ |
| 5 | Bash | ≥ 5.0 | `bash --version` | ☐ |
| 6 | jq (JSON 처리) | ≥ 1.6 | `jq --version` | ☐ |
| 7 | zip/unzip | 시스템 기본 | `zip --version` | ☐ |
| 8 | curl | ≥ 7.80 | `curl --version` | ☐ |

### 3.2 시험 도구

| # | 항목 | 설치 방법 | 확인 명령 | 설치 확인 |
|---|------|-----------|-----------|-----------|
| 1 | **ePubCheck 4.x (또는 5.x)** | 공식 GitHub 릴리즈 다운로드 후 PATH 등록 | `epubcheck --version` | ☐ |
| 2 | **Ace by DAISY** | `npm i -g @daisy/ace` (또는 이미 devDep으로 포함됨) | `ace --version` | ☐ |
| 3 | `epubchecker` (npm wrapper) | `npm i -g epubchecker` (devDep에 포함) | `npx epubchecker --version` | ☐ |
| 4 | Chromium (Playwright/브라우저 체크용) | 선택 — `pnpm install` 시 Puppeteer가 번들로 설치 | — | ☐ |

### 3.3 설치 검증 스크립트

```bash
# 한 줄로 환경 검증
for cmd in node pnpm git java jq zip curl; do
  if command -v $cmd >/dev/null 2>&1; then
    echo "OK  $cmd  $($cmd --version 2>&1 | head -1)"
  else
    echo "MISSING $cmd"
  fi
done
```

위 명령을 실행하여 모두 `OK`가 나와야 합니다.

---

## 4. 네트워크 요구사항

### 4.1 허용되어야 할 아웃바운드 접속

| 대상 | 프로토콜 | 용도 |
|------|---------|------|
| `github.com`, `codeload.github.com` | HTTPS | 저장소 clone, Actions 로그 접근 |
| `registry.npmjs.org`, `registry.npmmirror.com` | HTTPS | pnpm 패키지 다운로드 |
| `*.vercel.app`, `gov-epub-2026-three.vercel.app` | HTTPS | 프로덕션 웹 UI 검증 |
| `api.openai.com` | HTTPS | OpenAI LLM 호출 (선택) |
| `generativelanguage.googleapis.com` | HTTPS | Google Gemini 호출 (기본) |
| `api.elevenlabs.io` | HTTPS | ElevenLabs TTS 호출 (선택) |
| `api.stability.ai` | HTTPS | Stability AI 이미지 생성 (선택) |

### 4.2 네트워크 차단 확인

```bash
curl -sI https://github.com | head -1                          # HTTP/2 200 확인
curl -sI https://registry.npmjs.org | head -1                   # HTTP/2 200 확인
curl -sI https://gov-epub-2026-three.vercel.app | head -1       # HTTP/2 200 확인
```

방화벽/프록시 환경일 경우 `npm config set proxy ...` 설정을 사전 완료하십시오.

---

## 5. 저장소 및 의존성 준비

### 5.1 저장소 clone 위치

```bash
# 권장 경로
~/inspection/gov-epub-2026/
```

```bash
cd ~/inspection
git clone https://github.com/hayanmind/epub-remastering-tool.git gov-epub-2026
cd gov-epub-2026
git checkout main
git log -1 --oneline   # 최신 커밋 SHA 확인 후 시험기관 보고용 기록
```

### 5.2 의존성 선설치 (오프라인 시험 대비)

검수인 도착 전 아래 명령으로 node_modules 를 미리 받아 두십시오.

```bash
pnpm install --frozen-lockfile
pnpm -r build
pnpm -r test    # 사전 smoke test 통과 확인
```

**결과물 확인**:
- `packages/core/dist/` 존재
- `packages/api/dist/` 존재
- `packages/web/.next/` 존재 (또는 빌드만 검증)
- `Vitest 60/60 passed` 출력 확인

---

## 6. API 키 및 계정 세팅

### 6.1 `.env` 파일 위치

프로젝트 루트 `.env` 또는 `packages/web/.env.local` 에 사전 배치하십시오.

### 6.2 필수 · 선택 키

| 변수 | 필수/선택 | 용도 | 비고 |
|------|----------|------|------|
| `GEMINI_API_KEY` 또는 `GOOGLE_API_KEY` | **필수** | LLM (퀴즈/요약/튜터) | Google AI Studio 발급 |
| `OPENAI_API_KEY` | 선택 | LLM 대체/비교 | OpenAI Platform 발급 |
| `ELEVENLABS_API_KEY` | 선택 | TTS | ElevenLabs 발급 |
| `STABILITY_API_KEY` | 선택 | 이미지 생성 | Stability AI 발급 |
| `ANTHROPIC_API_KEY` | 선택 | LLM 대체 | Anthropic 발급 |
| `USE_MOCK` | 선택 | `1` 설정 시 AI 호출 없이 Mock 데이터 사용 | 오프라인 시험용 |

### 6.3 시험용 키 정책

- **신규 발급**: 시험 전용 키를 **신규 발급**하여 사용 (하얀마인드 상용 키 노출 방지).
- **사용 한도**: 발급 시점부터 시험 종료 + 1일까지 유효 기간으로 제한.
- **시험 종료 후 폐기**: 검수인 퇴근 직후 즉시 키 회수 및 Revoke.

### 6.4 Mock 모드 대안

AI 키 발급이 어려운 경우 `USE_MOCK=1` 환경변수로 AI 호출을 모두 생략하고 mock 데이터로 진행할 수 있습니다. 이 경우 KPI #4 (TTS 싱크)·#5 (TTS 무음) 일부는 **N/A** 판정이 되며, 성적서에 명시됩니다.

---

## 7. 시험 대상 데이터

### 7.1 기본 시험용 (7종, 필수)

| 경로 | 파일 수 | 용도 |
|------|--------|------|
| `fixtures/*.epub` | 3종 (문학/교육/동화) | 자체 생성 테스트 ePub |
| `fixtures/samples/*.epub` | 4종 (앨리스/지킬앤하이드/오만과편견/운수좋은날) | 공개 도메인 ePub |

### 7.2 대량 시험용 (1,010권, 선택)

| 경로 | 파일 수 | 용도 |
|------|--------|------|
| `fixtures/dataset-1000/literature/` | ~500종 | 영문 문학 (Project Gutenberg) |
| `fixtures/dataset-1000/non-fiction/` | ~500종 | 영문 비문학 (Project Gutenberg) |
| `fixtures/dataset-1000/korean/` | 10종 | 한국 문학 (Wikisource 등) |

**주의**: 대량 시험은 약 2~4시간 소요됩니다. 검수인과 사전 협의하여 수행 여부를 결정하십시오.

---

## 8. 검수인이 **터치하지 말아야 할** 리소스

시험 당일 혼동을 방지하기 위해 **접근 금지** 리소스를 사전 분리/차단해 두십시오.

| 항목 | 조치 |
|------|------|
| 프로덕션 데이터베이스 (Neon PostgreSQL) | 검수인 머신의 `.env`에서 **DATABASE_URL 제거**. 시험용 SQLite 또는 인메모리 사용 |
| Vercel Blob 실제 스토리지 | `.env`에서 프로덕션 토큰 제거, 로컬 파일시스템 사용 |
| Clerk 실제 사용자 계정 | 시험용 테스트 사용자 계정만 활성화 |
| `source/` 디렉토리 (사업 근거 문서) | **.gitignore에 이미 등록됨** — 검수인 머신에 애초에 존재하지 않음 |
| `outsourcing/` 디렉토리 (용역 서류) | **.gitignore에 이미 등록됨** |
| `/Users/jmoh/Workspace/gov-epub-2026-docs/` (내부 문서 리포) | 시험용 머신에서 해당 경로 clone 금지 |
| 하얀마인드 직원용 Slack·Notion 접근 | 시험용 머신에서 로그인 제거 |
| 고객 이메일 주소 / FGI 참여자 명단 | 시험 환경에 배포 금지 |

### 8.1 검증 절차

시험 착수 회의에서 검수인에게 아래를 **명시적으로 고지**하십시오.

> "본 시험은 `/Users/inspection/gov-epub-2026/` 하위 자료로 한정하여 수행됩니다. 해당 경로 외 자원(프로덕션 DB, 사업 문서, 고객 데이터)에 접근하지 마십시오."

---

## 9. 시험 당일 진행 절차

### 9.1 검수인 도착 ~ 착수 (30분)

| # | 단계 | 담당 |
|---|------|------|
| 1 | 인사 및 NDA 재확인 | 양측 |
| 2 | 시험 머신 로그인 계정 인계 | 하얀마인드 |
| 3 | 시험 범위·방법 재설명 | 하얀마인드 |
| 4 | 자체 시험성적서(`TEST_CERTIFICATE.md`) 열람 | 검수인 |
| 5 | `INSPECTOR-CHECKLIST.md` 공유 | 검수인 |

### 9.2 스크립트 실행 (20~40분)

```bash
cd ~/inspection/gov-epub-2026
bash scripts/inspect-run.sh
```

### 9.3 수동 확인 (30~60분)

- 프로덕션 URL 접속 · 원클릭 데모 실행 · 스크린샷
- 접근성 팝업/툴팁 확인
- 퀴즈/TTS 재생
- ePubCheck/Ace 결과 육안 검토

### 9.4 결과 수거 및 퇴실 (15분)

- `inspection-results/{timestamp}/` 폴더 + `inspection-{timestamp}.zip` 확인
- 검수인 USB/원격 폴더로 이동
- API 키 즉시 Revoke
- 시험 머신 전원 종료

---

## 10. 사전 점검 체크리스트 (시험 전날까지 완료)

| # | 항목 | 확인 |
|---|------|------|
| 1 | 시험 머신 하드웨어 요구사항 충족 | ☐ |
| 2 | 소프트웨어 8종 설치 확인 (§3.1) | ☐ |
| 3 | 시험 도구 설치 확인 (§3.2) | ☐ |
| 4 | 네트워크 아웃바운드 허용 확인 (§4) | ☐ |
| 5 | 저장소 clone + `pnpm install` 완료 | ☐ |
| 6 | `pnpm -r build` + `pnpm -r test` 통과 확인 | ☐ |
| 7 | `.env` API 키 세팅 (시험 전용 키) | ☐ |
| 8 | `fixtures/` 파일 존재 확인 | ☐ |
| 9 | 프로덕션 URL 정상 접속 확인 | ☐ |
| 10 | `scripts/inspect-run.sh` 한 번 실행하여 smoke 확인 | ☐ |
| 11 | 접근 금지 리소스 차단 (§8) | ☐ |
| 12 | 자체 시험성적서 PDF 인쇄본 1부 준비 | ☐ |
| 13 | 검수인용 수동 체크리스트 인쇄본 1부 준비 | ☐ |
| 14 | 시험 머신용 USB / 원격 업로드 경로 결정 | ☐ |
| 15 | 키 Revoke 절차 사전 확인 (Google AI Studio 등) | ☐ |

---

## 부록: 설치 참고 링크

- Node.js 20 LTS: https://nodejs.org/en/download
- pnpm: https://pnpm.io/installation
- ePubCheck: https://www.w3.org/publishing/epubcheck/
- Ace by DAISY: https://daisy.github.io/ace/
- Google AI Studio (Gemini 키 발급): https://aistudio.google.com/
- OpenAI Platform: https://platform.openai.com/
- ElevenLabs: https://elevenlabs.io/
