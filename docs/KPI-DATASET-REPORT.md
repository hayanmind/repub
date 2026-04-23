# ePub 1,010권 KPI 전수 검증 리포트

| 항목 | 값 |
|---|---|
| 검증 일시 | 2026-04-19T13:02:35.281Z |
| 대상 | 1010권 (literature 500 + non-fiction 500 + korean 10) |
| 모드 | Mock (재현 가능, 실제 AI API 호출 없음) |
| 소요 시간 | 751초 |
| 변환 성공 | 1010/1010 (100.0%) |

## KPI 달성 현황

| # | KPI | 측정값 | 목표 | 판정 |
|---|-----|--------|------|------|
| 1 | ePubCheck 통과율 | **100.0%** | ≥ 95% | ✅ PASS |
| 6 | KWCAG 접근성 충족율 | **93.6%** | ≥ 90% | ✅ PASS |
| 7 | 인터랙션 요소 자동 포함 | **4.0종/권** | ≥ 3종/권 | ✅ PASS |
| 8 | 평균 변환 시간 | **0.74초** | ≤ 3초 | ✅ PASS |
| 11 | 변환 후 구조 오류율 | **0.00%** | ≤ 2% | ✅ PASS |
| 99 | 변환 성공률 | **100.0%** | ≥ 95% | ✅ PASS |

## 카테고리별 변환 성공률

| 카테고리 | 성공/전체 | 성공률 |
|---------|-----------|--------|
| literature | 500/500 | 100.0% |
| non-fiction | 500/500 | 100.0% |
| korean | 10/10 | 100.0% |

## 기술 지표

- 평균 변환 시간: 0.74초
- P95 변환 시간: 0.98초
- 평균 챕터 수: 14.4
- 평균 접근성 점수: 93.6점
- 평균 인터랙션 요소: 4.0종/권

## 근거 파일

- 상세 JSON: `kpi-report-dataset.json` (파일별 측정값 1010건)
- 데이터셋 카탈로그: `fixtures/dataset-1000/catalog.db` (SQLite)
- 재실행 스크립트: `scripts/validate-kpi-dataset.ts`

## 재현 방법

```bash
pnpm install --frozen-lockfile
pnpm --filter @gov-epub/core build
npx tsx scripts/validate-kpi-dataset.ts
```

위 스크립트는 결정적(deterministic)이므로 동일 입력 시 동일 결과를 산출합니다.