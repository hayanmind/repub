# 검수인용 수동 체크리스트

> **대상 독자**: 공인 시험기관 소속 검수인
> **목적**: `scripts/inspect-run.sh` 자동 시험 외에 **육안·수동 확인**이 필요한 항목을 단계별로 안내
> **예상 소요 시간**: 30~60분
> **관련 문서**:
> - `docs/TESTWORKS-INSPECTION-GUIDE.md` — 의뢰 절차 전반
> - `docs/INSPECTOR-ENVIRONMENT.md` — 환경 구성 정보
> - `scripts/inspect-run.sh` — 자동 시험 스크립트

---

## 0. 시작 전 확인

| # | 항목 | 확인 |
|---|------|------|
| 1 | 로그인한 시험 머신이 `~/inspection/gov-epub-2026/` 경로에 위치 | ☐ |
| 2 | `docs/TEST_CERTIFICATE.md` (자체 시험성적서)를 먼저 열람 완료 | ☐ |
| 3 | 인터넷 연결 정상 (`ping github.com` 또는 `curl -sI https://gov-epub-2026-three.vercel.app` 확인) | ☐ |

---

## 1. 자동 스크립트 실행 단계

### 1.1 `inspect-run.sh` 실행

```bash
cd ~/inspection/gov-epub-2026
bash scripts/inspect-run.sh
```

- 소요: 20~40분
- 진행 중: 단계별 진행률이 컬러로 출력됨
- 실패 시: 화면에 원인 출력됨 — 즉시 하얀마인드 담당자에게 통보

### 1.2 결과 폴더 확인

스크립트 종료 후 아래 경로가 생성되었는지 확인하십시오.

```bash
ls -la inspection-results/
ls -la inspection-*.zip
```

**필수 산출물**:

| 파일 | 설명 | 확인 |
|------|------|------|
| `inspection-results/{timestamp}/kpi-report.json` | KPI 본편 (#1/6/7/8/10/12/13) | ☐ |
| `inspection-results/{timestamp}/kpi-report-extended.json` | KPI 확장 (#2/4/5) | ☐ |
| `inspection-results/{timestamp}/vitest.log` | Vitest 60 TC 실행 로그 | ☐ |
| `inspection-results/{timestamp}/epubcheck-report.json` | ePubCheck 전수 리포트 | ☐ |
| `inspection-results/{timestamp}/environment.txt` | Node/OS/Git SHA 환경 정보 | ☐ |
| `inspection-results/{timestamp}/summary.txt` | 종합 요약 | ☐ |
| `inspection-{timestamp}.zip` | 위 폴더의 ZIP 압축본 | ☐ |

---

## 2. 프로덕션 웹 UI 확인

### 2.1 원클릭 데모 플로우

브라우저(Chrome 또는 Safari 최신)에서 아래 절차를 수행하고 **각 단계 스크린샷**을 캡처하십시오.

| # | 단계 | URL | 확인 포인트 | 스크린샷 |
|---|------|-----|-------------|---------|
| 1 | 대시보드 접속 | https://gov-epub-2026-three.vercel.app/ | 페이지 로딩 정상, 인트로 화면 표시 | ☐ |
| 2 | "데모 시작" 버튼 클릭 | — | 자동으로 변환 단계로 이동 | ☐ |
| 3 | 변환 진행 화면 | `/convert` | 1단계(파싱)→2단계(AI)→3단계(패키징) 진행률 표시 | ☐ |
| 4 | 미리보기 화면 (Before/After) | `/preview` | 원본/변환본 분할 뷰, AI 변환 구간 하이라이팅 | ☐ |
| 5 | KPI 리포트 화면 | `/report` | 13개 KPI 지표 카드로 표시, PASS/FAIL 표시 | ☐ |
| 6 | 설정 페이지 | `/settings` | API 키 관리 UI, Zero-Retention 안내 | ☐ |
| 7 | 가이드 페이지 | `/guide` | Interactive Tutorial 접근 가능 | ☐ |

### 2.2 접근성 기능 확인

변환된 콘텐츠(운수 좋은 날 데모)의 미리보기에서 아래를 확인하십시오.

| # | 확인 항목 | 확인 |
|---|----------|------|
| 1 | 이미지에 alt 텍스트 존재 (브라우저 개발자 도구 Inspect로 `<img alt="..." />` 확인) | ☐ |
| 2 | 제목 계층(h1-h6)이 의미에 맞게 사용됨 | ☐ |
| 3 | `lang="ko"` 또는 `lang="en"` 속성이 html 태그에 존재 | ☐ |
| 4 | 스크린리더 우선순위(reading order)가 시각적 순서와 일치 | ☐ |
| 5 | 색상 대비(WCAG AA) — 본문 텍스트/배경 대비 4.5:1 이상 | ☐ |

**간이 검증 방법**: Chrome DevTools > Lighthouse > Accessibility 탭 실행 → 점수 85 이상 확인.

### 2.3 인터랙티브 요소 확인

| # | 확인 항목 | 확인 |
|---|----------|------|
| 1 | 퀴즈 카드 표시 + 보기 클릭 시 정답/오답 피드백 동작 | ☐ |
| 2 | 용어 팝업/툴팁 — 본문 내 밑줄 단어 클릭 시 설명 표시 | ☐ |
| 3 | TTS 플레이어 — 재생 버튼 클릭 시 오디오 재생 + 파형 시각화 | ☐ |
| 4 | TTS 싱크 — 재생 중 현재 문장이 하이라이트됨 | ☐ |
| 5 | AI 튜터 채팅 — 질문 입력 시 응답 생성 (키 없으면 mock 응답) | ☐ |

---

## 3. ePubCheck 수동 재실행 절차

자동 스크립트의 결과와 별도로, 임의의 ePub 파일 1~2개를 수동 재실행하여 교차 검증하십시오.

```bash
# 예시: 운수 좋은 날 변환 결과 재검증
cd ~/inspection/gov-epub-2026
ls inspection-results/{timestamp}/converted/
npx epubchecker inspection-results/{timestamp}/converted/lucky-day-converted.epub
```

| # | 확인 항목 | 기준 | 확인 |
|---|----------|------|------|
| 1 | ePubCheck 종료 코드 0 | PASS | ☐ |
| 2 | 에러 0건 | 필수 | ☐ |
| 3 | 경고 건수 | 5건 이하 권장 | ☐ |
| 4 | `package.opf` 스키마 검증 통과 | 필수 | ☐ |
| 5 | 매니페스트-실제파일 참조 무결성 | 필수 | ☐ |

---

## 4. Ace by DAISY 수동 재실행 절차

```bash
cd ~/inspection/gov-epub-2026
npx ace inspection-results/{timestamp}/converted/lucky-day-converted.epub -o /tmp/ace-report/
open /tmp/ace-report/report.html   # macOS
# xdg-open /tmp/ace-report/report.html   # Linux
```

| # | 확인 항목 | 기준 | 확인 |
|---|----------|------|------|
| 1 | `accessibility-1.1.json` 스키마 적합성 | PASS | ☐ |
| 2 | violation(심각) 0건 | 필수 | ☐ |
| 3 | warning 5건 이하 | 권장 | ☐ |
| 4 | EPUB Accessibility 1.1 `accessMode` 메타데이터 존재 | 필수 | ☐ |
| 5 | schema.org `accessibilityFeature` 선언 | 필수 | ☐ |

---

## 5. KPI별 측정값 확인 및 스크린샷 가이드

검수인 보고서 작성용으로 KPI별 측정값을 확인하고 스크린샷을 캡처하십시오.

### 5.1 확인 방법

```bash
cd ~/inspection/gov-epub-2026
cat inspection-results/{timestamp}/kpi-report.json | jq '.kpis'
cat inspection-results/{timestamp}/kpi-report-extended.json | jq '.kpis'
```

### 5.2 스크린샷 대상

| KPI | 측정 소스 | 스크린샷 대상 |
|-----|-----------|--------------|
| #1 ePubCheck 통과율 | `kpi-report.json` + `epubcheck-report.json` | 터미널 출력 또는 JSON 내용 |
| #2 퀴즈 HTML 오류율 | `kpi-report-extended.json` | JSON 내용 |
| #3 퀴즈 JSON 스키마 통과율 | `kpi-report.json` | 터미널 출력 |
| #4 TTS 싱크 정확도 | `kpi-report-extended.json` | JSON 내용 |
| #5 TTS 무음 비율 | `kpi-report-extended.json` | JSON 내용 |
| #6 KWCAG 접근성 | `kpi-report.json` (+ Ace 리포트) | JSON + Ace HTML 리포트 |
| #7 인터랙션 요소 수 | `kpi-report.json` | 터미널 출력 |
| #8 API 응답시간 | `kpi-report.json` (변환 시간 기반) | 터미널 출력 |
| #9 시스템 가용률 | 프로덕션 URL 접속 기록 | 브라우저 HTTP 200 응답 |
| #10 자동 TC 통과율 | `vitest.log` | Vitest 요약 라인 |
| #11 변환 후 구조 오류율 | `epubcheck-report.json` | JSON |
| #12 GitHub Actions 통과율 | https://github.com/hayanmind/epub-remastering-tool/actions | 브라우저 화면 |
| #13 문서화 커버리지 | `docs/` 파일 수 (`ls docs/*.md \| wc -l`) | 터미널 출력 |

### 5.3 스크린샷 파일명 규칙

```
screenshot-kpi-{번호}-{YYYYMMDD}-{HHMM}.png
예: screenshot-kpi-01-20260420-1430.png
```

스크린샷 파일은 `inspection-results/{timestamp}/screenshots/` 하위에 저장하십시오.

---

## 6. Vitest 결과 재확인

```bash
cd ~/inspection/gov-epub-2026
grep -E "(Tests|passed|failed)" inspection-results/{timestamp}/vitest.log | tail -20
```

| # | 확인 항목 | 기준 | 확인 |
|---|----------|------|------|
| 1 | Vitest 실행 완료 (종료 코드 0) | 필수 | ☐ |
| 2 | Test Suites 통과 수 | ≥ 5 suites | ☐ |
| 3 | Tests 통과 수 | 60/60 또는 ≥ 90% | ☐ |
| 4 | Skipped/Todo 수 | 0 권장 | ☐ |

---

## 7. GitHub Actions CI 확인 (선택)

```
https://github.com/hayanmind/epub-remastering-tool/actions
```

| # | 확인 항목 | 기준 | 확인 |
|---|----------|------|------|
| 1 | 최신 main 브랜치 CI 통과 (녹색 체크) | 필수 | ☐ |
| 2 | 최근 10회 CI 통과율 | 100% | ☐ |
| 3 | Workflow 종류 | 빌드 + 테스트 + 타입체크 최소 3종 | ☐ |

---

## 8. 최종 종합 점검

### 8.1 KPI 달성 현황

| # | KPI | 목표 | 측정값 | 달성 |
|---|-----|------|--------|------|
| 1 | ePubCheck 통과율 | ≥ 95% | ____% | ☐ |
| 2 | 퀴즈 HTML 오류율 | ≤ 1% | ____% | ☐ |
| 3 | 퀴즈 JSON 스키마 통과율 | ≥ 98% | ____% | ☐ |
| 4 | TTS 텍스트 싱크 정확도 | ≥ 98% | ____% | ☐ |
| 5 | TTS 무음 구간 비율 | ≤ 5% | ____% | ☐ |
| 6 | KWCAG 접근성 충족율 | ≥ 90% | ____% | ☐ |
| 7 | 인터랙션 요소 수 | ≥ 3종/권 | ____종 | ☐ |
| 8 | API 평균 응답시간 | ≤ 3초 | ____초 | ☐ |
| 9 | 시스템 가용률 | ≥ 99.5% | ____% | ☐ |
| 10 | 자동 TC 통과율 | ≥ 90% | ____% | ☐ |
| 11 | 변환 후 구조 오류율 | ≤ 2% | ____% | ☐ |
| 12 | GitHub Actions 통과율 | 100% | ____% | ☐ |
| 13 | 문서화 커버리지 | ≥ 3건 | ____건 | ☐ |

### 8.2 종합 의견 (검수인 작성란)

```
시험 일자:
시험 수행자:
시험 장소:
종합 판정: PASS / FAIL / 부분 PASS
특이사항:



```

---

## 9. 산출물 인계

시험 종료 시 아래를 검수인 보관용 매체(USB/원격)에 복사하십시오.

| # | 인계물 | 원본 경로 |
|---|--------|-----------|
| 1 | `inspection-{timestamp}.zip` | 프로젝트 루트 |
| 2 | `inspection-results/{timestamp}/` 폴더 전체 | 프로젝트 루트 |
| 3 | `screenshots/` 폴더 (검수인이 캡처한 스크린샷) | 검수인 직접 저장 |
| 4 | 본 체크리스트 수기/전자 기록본 | 검수인 직접 보관 |

---

## 부록: 문제 발생 시 대응

| 문제 | 대응 |
|------|------|
| `inspect-run.sh` 실행 중 에러 | 에러 메시지 스크린샷 후 하얀마인드 담당자(오정민, jmoh@hayanmind.com) 통보 |
| 프로덕션 URL 접속 실패 | 네트워크/방화벽 확인 후 Vercel 상태 페이지(https://vercel.com/status) 확인 |
| API 키 오류 (401/403) | `.env` 파일 확인, 필요시 `USE_MOCK=1` 환경변수로 재실행 |
| Vitest 일부 실패 | 하얀마인드 담당자 통보 + `vitest.log` 첨부 |
| ePubCheck 경고 다수 | 경고 항목 리스트 스크린샷 후 판단 (에러 아닌 경고는 통상 허용) |
