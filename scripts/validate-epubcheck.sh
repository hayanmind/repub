#!/bin/bash
# ePubCheck validation script for all sample & fixture ePub files
# Outputs JSON reports to scripts/reports/

set -e

REPORT_DIR="scripts/reports"
mkdir -p "$REPORT_DIR"

PASS=0
FAIL=0
TOTAL=0

echo "=== ePubCheck Validation ==="
echo ""

for epub in fixtures/*.epub fixtures/samples/*.epub; do
  if [ ! -f "$epub" ]; then continue; fi
  TOTAL=$((TOTAL + 1))
  basename=$(basename "$epub" .epub)
  report="$REPORT_DIR/epubcheck-${basename}.json"

  echo -n "  Checking $epub ... "
  if npx epubchecker "$epub" -O "$report" 2>/dev/null; then
    echo "PASS"
    PASS=$((PASS + 1))
  else
    echo "FAIL (see $report)"
    FAIL=$((FAIL + 1))
  fi
done

echo ""
echo "=== Results ==="
echo "  Total: $TOTAL"
echo "  Pass:  $PASS"
echo "  Fail:  $FAIL"
echo "  Rate:  $(( PASS * 100 / TOTAL ))%"
echo ""

if [ $FAIL -gt 0 ]; then
  echo "Some files failed validation. Check reports in $REPORT_DIR/"
  exit 1
fi

echo "All files passed ePubCheck validation."
