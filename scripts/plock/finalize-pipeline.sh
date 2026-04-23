#!/usr/bin/env bash
# Final pipeline after slide backgrounds are all generated.
# Steps:
#   1. Clear old card news PNGs + scene PNGs + video .tmp
#   2. Re-render 477 card news (v3) with slide-specific images
#   3. Re-compose 27 video scenes (v3, text top / SRT bottom)
#   4. Rebuild 4 videos
set -e

cd /Users/jmoh/Workspace/gov-epub-2026

echo "━━━ 1/4 Clearing stale PNGs ━━━"
find "/Users/jmoh/Workspace/gov-epub-2026-docs/outsourcing/plock/결과물/산출물/01-카드뉴스/PNG" -name "*.png" -delete
rm -rf /Users/jmoh/Workspace/gov-epub-2026/scripts/plock/assets/scenes
rm -rf /Users/jmoh/Workspace/gov-epub-2026/scripts/plock/assets/.tmp

echo "━━━ 2/4 Re-rendering 477 card news (v3) ━━━"
npx tsx scripts/plock/render-cardnews-v3.ts

echo "━━━ 3/4 Re-composing 27 scenes (v3) ━━━"
npx tsx scripts/plock/compose-scenes-v3.ts

echo "━━━ 4/4 Rebuilding 4 videos ━━━"
npx tsx scripts/plock/build-videos.ts

echo "✓ Pipeline complete."
