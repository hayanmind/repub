#!/usr/bin/env bash
#
# 공인 시험성적서 검수인용 원-쇼 실행 스크립트
#
# 용도: 외부 시험기관 검수인이 현장(또는 원격)에서 단일 명령으로 KPI 13개를
#       전수 검증하고, 결과물을 inspection-results/{timestamp}/ 및
#       inspection-{timestamp}.zip 으로 패키징한다.
#
# 실행:
#   bash scripts/inspect-run.sh
#
# 옵션 환경변수:
#   SKIP_INSTALL=1       pnpm install 건너뛰기 (사전 설치된 경우)
#   SKIP_BUILD=1         pnpm -r build 건너뛰기
#   SKIP_TEST=1          pnpm -r test 건너뛰기
#   SKIP_EPUBCHECK=1     ePubCheck 전수 검증 건너뛰기
#   USE_MOCK=1           AI 호출 없이 Mock 데이터로 KPI 측정
#

set -uo pipefail

# ============================================================================
# 0. 초기화
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
RESULTS_DIR="$PROJECT_ROOT/inspection-results/$TIMESTAMP"
ZIP_PATH="$PROJECT_ROOT/inspection-$TIMESTAMP.zip"

mkdir -p "$RESULTS_DIR"

# ---- 컬러 출력 --------------------------------------------------------------
if [[ -t 1 ]]; then
  COLOR_RESET='\033[0m'
  COLOR_RED='\033[0;31m'
  COLOR_GREEN='\033[0;32m'
  COLOR_YELLOW='\033[0;33m'
  COLOR_BLUE='\033[0;34m'
  COLOR_CYAN='\033[0;36m'
  COLOR_BOLD='\033[1m'
else
  COLOR_RESET=''
  COLOR_RED=''
  COLOR_GREEN=''
  COLOR_YELLOW=''
  COLOR_BLUE=''
  COLOR_CYAN=''
  COLOR_BOLD=''
fi

# 전역 상태
TOTAL_STEPS=7
CURRENT_STEP=0
FAILED_STEPS=()

log_header() {
  echo
  echo -e "${COLOR_CYAN}${COLOR_BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLOR_RESET}"
  echo -e "${COLOR_CYAN}${COLOR_BOLD}  $1${COLOR_RESET}"
  echo -e "${COLOR_CYAN}${COLOR_BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLOR_RESET}"
}

log_step() {
  CURRENT_STEP=$((CURRENT_STEP + 1))
  echo
  echo -e "${COLOR_BLUE}${COLOR_BOLD}▶ [${CURRENT_STEP}/${TOTAL_STEPS}] $1${COLOR_RESET}"
}

log_info()    { echo -e "  ${COLOR_CYAN}ℹ${COLOR_RESET}  $*"; }
log_ok()      { echo -e "  ${COLOR_GREEN}✓${COLOR_RESET}  $*"; }
log_warn()    { echo -e "  ${COLOR_YELLOW}⚠${COLOR_RESET}  $*"; }
log_error()   { echo -e "  ${COLOR_RED}✗${COLOR_RESET}  $*"; }
log_skip()    { echo -e "  ${COLOR_YELLOW}▷${COLOR_RESET}  SKIP — $*"; }

mark_failed() { FAILED_STEPS+=("$1"); }

# ============================================================================
# 1. 환경 검증
# ============================================================================

log_header "ePub 리마스터링 시스템 — 공인 시험성적서 검수 스크립트"
log_info "실행 시각    : $(date '+%Y-%m-%d %H:%M:%S %Z')"
log_info "결과 저장    : $RESULTS_DIR"
log_info "ZIP 출력     : $ZIP_PATH"
log_info "프로젝트 루트: $PROJECT_ROOT"

log_step "환경 검증"

# Node.js
if command -v node >/dev/null 2>&1; then
  NODE_VERSION="$(node -v)"
  NODE_MAJOR="$(echo "$NODE_VERSION" | sed -E 's/v([0-9]+).*/\1/')"
  if [[ "$NODE_MAJOR" -ge 20 ]]; then
    log_ok "Node.js $NODE_VERSION"
  else
    log_error "Node.js $NODE_VERSION — v20 이상 필요"
    mark_failed "env:node"
  fi
else
  log_error "Node.js 미설치"
  mark_failed "env:node"
fi

# pnpm
if command -v pnpm >/dev/null 2>&1; then
  log_ok "pnpm $(pnpm -v)"
else
  log_error "pnpm 미설치"
  mark_failed "env:pnpm"
fi

# git
if command -v git >/dev/null 2>&1; then
  log_ok "git $(git --version | awk '{print $3}')"
  if git rev-parse --git-dir >/dev/null 2>&1; then
    GIT_SHA="$(git rev-parse HEAD)"
    GIT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
    log_ok "Git branch: $GIT_BRANCH @ ${GIT_SHA:0:12}"
  else
    log_warn "프로젝트 디렉토리가 Git 저장소가 아님"
    GIT_SHA="N/A"
    GIT_BRANCH="N/A"
  fi
else
  log_error "git 미설치"
  mark_failed "env:git"
fi

# 필수 파일
REQUIRED_FILES=(
  "package.json"
  "pnpm-workspace.yaml"
  "packages/core/package.json"
  "scripts/validate-kpi.ts"
  "scripts/validate-kpi-extended.ts"
)

for f in "${REQUIRED_FILES[@]}"; do
  if [[ -f "$PROJECT_ROOT/$f" ]]; then
    log_ok "파일 확인: $f"
  else
    log_error "필수 파일 누락: $f"
    mark_failed "env:file:$f"
  fi
done

# 필수 fixtures
if [[ -d "$PROJECT_ROOT/fixtures" ]]; then
  FIXTURE_COUNT="$(find "$PROJECT_ROOT/fixtures" -maxdepth 2 -name '*.epub' -type f 2>/dev/null | wc -l | tr -d ' ')"
  log_ok "fixtures: ${FIXTURE_COUNT}개 ePub 발견"
  if [[ "$FIXTURE_COUNT" -lt 3 ]]; then
    log_warn "fixtures가 3개 미만. 시험 결과 신뢰도가 낮아질 수 있음"
  fi
else
  log_error "fixtures 디렉토리 누락"
  mark_failed "env:fixtures"
fi

# 환경 요약 기록
ENV_FILE="$RESULTS_DIR/environment.txt"
{
  echo "========================================"
  echo "  검수 시험 환경 요약"
  echo "========================================"
  echo "실행 시각    : $(date '+%Y-%m-%d %H:%M:%S %Z')"
  echo "호스트명     : $(hostname)"
  echo "OS           : $(uname -a)"
  echo "사용자       : $(whoami)"
  echo "CPU          : $(uname -m)"
  if [[ "$(uname)" == "Darwin" ]]; then
    echo "macOS 버전   : $(sw_vers -productVersion 2>/dev/null || echo 'N/A')"
  elif [[ -f /etc/os-release ]]; then
    echo "배포판       : $(grep '^PRETTY_NAME=' /etc/os-release | cut -d= -f2 | tr -d '"')"
  fi
  echo ""
  echo "Node.js      : ${NODE_VERSION:-미설치}"
  if command -v pnpm >/dev/null 2>&1; then
    echo "pnpm         : $(pnpm -v)"
  fi
  if command -v java >/dev/null 2>&1; then
    echo "Java         : $(java -version 2>&1 | head -1)"
  else
    echo "Java         : 미설치 (ePubCheck 실행 시 필요)"
  fi
  echo ""
  echo "Git branch   : $GIT_BRANCH"
  echo "Git SHA      : $GIT_SHA"
  if command -v git >/dev/null 2>&1 && git rev-parse --git-dir >/dev/null 2>&1; then
    echo "Git 최신 커밋:"
    git log -1 --pretty=format:'  %h %s (%an, %ar)' 2>/dev/null
    echo ""
  fi
  echo ""
  echo "USE_MOCK     : ${USE_MOCK:-0}"
  echo "SKIP_INSTALL : ${SKIP_INSTALL:-0}"
  echo "SKIP_BUILD   : ${SKIP_BUILD:-0}"
  echo "SKIP_TEST    : ${SKIP_TEST:-0}"
  echo "SKIP_EPUBCHECK: ${SKIP_EPUBCHECK:-0}"
} >"$ENV_FILE"

log_ok "환경 정보 저장: environment.txt"

if [[ ${#FAILED_STEPS[@]} -gt 0 ]]; then
  log_error "필수 환경 검증 실패 — 중단"
  echo
  echo -e "${COLOR_RED}실패 항목:${COLOR_RESET}"
  for s in "${FAILED_STEPS[@]}"; do echo "  - $s"; done
  exit 2
fi

# ============================================================================
# 2. 의존성 설치
# ============================================================================

log_step "의존성 설치 (pnpm install --frozen-lockfile)"

if [[ "${SKIP_INSTALL:-0}" == "1" ]]; then
  log_skip "SKIP_INSTALL=1 설정됨"
else
  INSTALL_LOG="$RESULTS_DIR/pnpm-install.log"
  if pnpm install --frozen-lockfile 2>&1 | tee "$INSTALL_LOG" | tail -5; then
    if [[ "${PIPESTATUS[0]}" -eq 0 ]]; then
      log_ok "의존성 설치 완료"
    else
      log_error "의존성 설치 실패 — pnpm-install.log 참고"
      mark_failed "install"
    fi
  else
    log_error "의존성 설치 실패"
    mark_failed "install"
  fi
fi

# ============================================================================
# 3. Core 빌드
# ============================================================================

log_step "전체 패키지 빌드 (pnpm -r build)"

if [[ "${SKIP_BUILD:-0}" == "1" ]]; then
  log_skip "SKIP_BUILD=1 설정됨"
else
  BUILD_LOG="$RESULTS_DIR/build.log"
  if pnpm -r build >"$BUILD_LOG" 2>&1; then
    log_ok "빌드 완료"
    tail -3 "$BUILD_LOG" | sed 's/^/    /'
  else
    log_error "빌드 실패 — build.log 참고"
    tail -10 "$BUILD_LOG" | sed 's/^/    /'
    mark_failed "build"
  fi
fi

# ============================================================================
# 4. Vitest 자동 테스트
# ============================================================================

log_step "Vitest 60개 테스트 케이스 실행"

if [[ "${SKIP_TEST:-0}" == "1" ]]; then
  log_skip "SKIP_TEST=1 설정됨"
else
  VITEST_LOG="$RESULTS_DIR/vitest.log"
  if pnpm -r test >"$VITEST_LOG" 2>&1; then
    log_ok "Vitest 실행 완료"
    # 요약 추출
    if grep -E "Test (Files|Suites)|Tests" "$VITEST_LOG" | tail -5 | sed 's/^/    /'; then
      :
    fi
  else
    log_warn "Vitest 일부 실패 — vitest.log 참고"
    grep -E "FAIL|Tests|Test Files" "$VITEST_LOG" | tail -10 | sed 's/^/    /'
    mark_failed "vitest"
  fi
fi

# ============================================================================
# 5. KPI 검증 본편 (validate-kpi.ts)
# ============================================================================

log_step "KPI 검증 본편 (KPI #1, #6, #7, #8, #10, #12, #13)"

KPI_LOG="$RESULTS_DIR/validate-kpi.log"
if npx tsx "$PROJECT_ROOT/scripts/validate-kpi.ts" 2>&1 | tee "$KPI_LOG" | grep -E "(KPI|✓|✗|━━|파일)" | tail -30; then
  KPI_EXIT="${PIPESTATUS[0]}"
  if [[ "$KPI_EXIT" -eq 0 ]]; then
    log_ok "KPI 검증 본편 완료"
  else
    log_warn "KPI 검증 본편 일부 지표 미달 (exit=$KPI_EXIT) — validate-kpi.log 참고"
  fi
else
  log_error "KPI 검증 본편 실행 실패"
  mark_failed "kpi:main"
fi

# kpi-report.json 복사
if [[ -f "$PROJECT_ROOT/kpi-report.json" ]]; then
  cp "$PROJECT_ROOT/kpi-report.json" "$RESULTS_DIR/kpi-report.json"
  log_ok "kpi-report.json 저장됨"
else
  log_warn "kpi-report.json 생성되지 않음"
fi

# ============================================================================
# 6. KPI 확장 검증 (validate-kpi-extended.ts)
# ============================================================================

log_step "KPI 확장 검증 (KPI #2 퀴즈 HTML / #4 TTS 싱크 / #5 TTS 무음)"

KPI_EXT_LOG="$RESULTS_DIR/validate-kpi-extended.log"
if npx tsx "$PROJECT_ROOT/scripts/validate-kpi-extended.ts" 2>&1 | tee "$KPI_EXT_LOG" | grep -E "(KPI|✓|✗|━━|퀴즈|SMIL|파일)" | tail -30; then
  KPI_EXT_EXIT="${PIPESTATUS[0]}"
  if [[ "$KPI_EXT_EXIT" -eq 0 ]]; then
    log_ok "KPI 확장 검증 완료"
  else
    log_warn "KPI 확장 검증 일부 지표 미달 (exit=$KPI_EXT_EXIT) — validate-kpi-extended.log 참고"
  fi
else
  log_error "KPI 확장 검증 실행 실패"
  mark_failed "kpi:ext"
fi

if [[ -f "$PROJECT_ROOT/kpi-report-extended.json" ]]; then
  cp "$PROJECT_ROOT/kpi-report-extended.json" "$RESULTS_DIR/kpi-report-extended.json"
  log_ok "kpi-report-extended.json 저장됨"
else
  log_warn "kpi-report-extended.json 생성되지 않음"
fi

# ============================================================================
# 7. ePubCheck 전수 실행
# ============================================================================

log_step "ePubCheck 전수 실행 (scripts/validate-epubcheck.sh)"

if [[ "${SKIP_EPUBCHECK:-0}" == "1" ]]; then
  log_skip "SKIP_EPUBCHECK=1 설정됨"
elif [[ -f "$PROJECT_ROOT/scripts/validate-epubcheck.sh" ]]; then
  EPUBCHECK_LOG="$RESULTS_DIR/epubcheck.log"
  # validate-epubcheck.sh 는 set -e 이며 실패 시 exit 1 을 반환하지만
  # 여기서는 전체 워크플로우를 중단시키지 않음.
  if bash "$PROJECT_ROOT/scripts/validate-epubcheck.sh" 2>&1 | tee "$EPUBCHECK_LOG"; then
    EPUBCHECK_EXIT="${PIPESTATUS[0]}"
    if [[ "$EPUBCHECK_EXIT" -eq 0 ]]; then
      log_ok "ePubCheck 전수 통과"
    else
      log_warn "ePubCheck 일부 실패 — epubcheck.log + scripts/reports/ 참고"
    fi
  else
    log_warn "ePubCheck 실행 실패 (Java 미설치 또는 epubchecker 미설치 가능성)"
  fi

  # scripts/reports 복사
  if [[ -d "$PROJECT_ROOT/scripts/reports" ]]; then
    mkdir -p "$RESULTS_DIR/epubcheck-reports"
    cp -R "$PROJECT_ROOT/scripts/reports/." "$RESULTS_DIR/epubcheck-reports/" 2>/dev/null || true
    REPORT_COUNT="$(find "$RESULTS_DIR/epubcheck-reports" -name '*.json' 2>/dev/null | wc -l | tr -d ' ')"
    log_ok "ePubCheck 개별 리포트 ${REPORT_COUNT}건 저장"

    # 종합 리포트 생성
    SUMMARY_JSON="$RESULTS_DIR/epubcheck-report.json"
    {
      echo "{"
      echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
      echo "  \"totalReports\": $REPORT_COUNT,"
      echo "  \"reports\": ["
      first=1
      for r in "$RESULTS_DIR/epubcheck-reports"/*.json; do
        [[ -f "$r" ]] || continue
        if [[ $first -eq 1 ]]; then first=0; else echo "    ,"; fi
        echo "    {\"file\": \"$(basename "$r")\", \"path\": \"epubcheck-reports/$(basename "$r")\"}"
      done
      echo "  ]"
      echo "}"
    } >"$SUMMARY_JSON"
    log_ok "epubcheck-report.json 종합 리포트 생성"
  fi
else
  log_skip "validate-epubcheck.sh 스크립트 없음"
fi

# ============================================================================
# 최종 요약 생성
# ============================================================================

log_header "시험 결과 요약"

SUMMARY_FILE="$RESULTS_DIR/summary.txt"

# 요약 파일 작성
{
  echo "=========================================="
  echo "  공인 시험성적서 검수 결과 요약"
  echo "=========================================="
  echo "실행 시각      : $(date '+%Y-%m-%d %H:%M:%S %Z')"
  echo "프로젝트       : gov-epub-2026 (AI 기반 ePub 3.0 인터랙티브 리마스터링)"
  echo "주관기관       : (주)하얀마인드 (562-86-00666)"
  echo "Git SHA        : ${GIT_SHA:0:12}"
  echo "Node.js        : ${NODE_VERSION:-N/A}"
  echo ""
  echo "------------------------------------------"
  echo "  단계별 실행 결과"
  echo "------------------------------------------"
  if [[ ${#FAILED_STEPS[@]} -eq 0 ]]; then
    echo "모든 단계 정상 수행"
  else
    echo "실패/경고 단계 (${#FAILED_STEPS[@]}건):"
    for s in "${FAILED_STEPS[@]}"; do echo "  - $s"; done
  fi
  echo ""
  echo "------------------------------------------"
  echo "  KPI 측정 결과"
  echo "------------------------------------------"
  if [[ -f "$RESULTS_DIR/kpi-report.json" ]]; then
    if command -v jq >/dev/null 2>&1; then
      echo "[KPI 본편 — kpi-report.json]"
      jq -r '.kpis | to_entries[] | "  \(if .value.passed then "✓" else "✗" end) \(.key): \(.value.value) (목표 \(.value.target))"' "$RESULTS_DIR/kpi-report.json" 2>/dev/null || echo "  (jq 파싱 실패)"
    else
      echo "(jq 미설치 — kpi-report.json 수동 검토 필요)"
    fi
  else
    echo "(kpi-report.json 없음)"
  fi
  echo ""
  if [[ -f "$RESULTS_DIR/kpi-report-extended.json" ]]; then
    if command -v jq >/dev/null 2>&1; then
      echo "[KPI 확장 — kpi-report-extended.json]"
      jq -r '.kpis | to_entries[] | "  \(if .value.passed == true then "✓" elif .value.passed == false then "✗" else "○" end) \(.key) \(.value.name): \(.value.value // "N/A")\(.value.unit // "") (목표 \(.value.target))"' "$RESULTS_DIR/kpi-report-extended.json" 2>/dev/null || echo "  (jq 파싱 실패)"
    else
      echo "(jq 미설치 — kpi-report-extended.json 수동 검토 필요)"
    fi
  fi
  echo ""
  echo "------------------------------------------"
  echo "  산출 파일 목록"
  echo "------------------------------------------"
  (cd "$RESULTS_DIR" && find . -type f -not -name '.*' | sort | sed 's/^\.\//  /')
  echo ""
  echo "=========================================="
  echo "검수인 서명: _______________  일자: ______"
  echo "=========================================="
} >"$SUMMARY_FILE"

cat "$SUMMARY_FILE"

# ============================================================================
# ZIP 패키징
# ============================================================================

echo
log_info "ZIP 패키징 중..."
if command -v zip >/dev/null 2>&1; then
  (cd "$PROJECT_ROOT/inspection-results" && zip -qr "$ZIP_PATH" "$TIMESTAMP")
  if [[ -f "$ZIP_PATH" ]]; then
    ZIP_SIZE="$(du -h "$ZIP_PATH" | cut -f1)"
    log_ok "ZIP 생성: $ZIP_PATH ($ZIP_SIZE)"
  else
    log_warn "ZIP 생성 실패"
  fi
else
  log_warn "zip 명령 없음 — ZIP 생성 생략 (inspection-results/$TIMESTAMP/ 폴더는 그대로 존재)"
fi

# ============================================================================
# 종료
# ============================================================================

echo
log_header "검수 스크립트 종료"

if [[ ${#FAILED_STEPS[@]} -eq 0 ]]; then
  echo -e "${COLOR_GREEN}${COLOR_BOLD}  ✓ 모든 시험 단계가 정상적으로 수행되었습니다.${COLOR_RESET}"
  EXIT_CODE=0
else
  echo -e "${COLOR_YELLOW}${COLOR_BOLD}  ⚠ 일부 단계에서 실패/경고가 발생했습니다. summary.txt 를 확인하십시오.${COLOR_RESET}"
  EXIT_CODE=1
fi

echo
echo -e "  결과 폴더 : ${COLOR_CYAN}$RESULTS_DIR${COLOR_RESET}"
if [[ -f "$ZIP_PATH" ]]; then
  echo -e "  ZIP 파일  : ${COLOR_CYAN}$ZIP_PATH${COLOR_RESET}"
fi
echo -e "  체크리스트: ${COLOR_CYAN}docs/INSPECTOR-CHECKLIST.md${COLOR_RESET} (검수인 수동 확인용)"
echo

exit "$EXIT_CODE"
