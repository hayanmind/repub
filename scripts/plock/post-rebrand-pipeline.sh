#!/usr/bin/env bash
# After rebrand (cardnews.json + video-scripts.ts updated with RePub),
# regenerate narration → card news PNGs → video scenes → videos.
set -e
cd /Users/jmoh/Workspace/gov-epub-2026

echo "━━━ 1/5 narration 재생성 (Jessica + ElevenLabs) ━━━"
rm -rf scripts/plock/assets/narration
npx tsx scripts/plock/generate-narration.ts

echo "━━━ 2/5 카드뉴스 PNG 삭제 ━━━"
find "/Users/jmoh/Workspace/gov-epub-2026-docs/outsourcing/plock/결과물/산출물/01-카드뉴스/PNG" -name "*.png" -delete

echo "━━━ 3/5 카드뉴스 v3 재렌더 (477장) ━━━"
npx tsx scripts/plock/render-cardnews-v3.ts

echo "━━━ 4/5 Scene v3 재합성 (27 scene) ━━━"
rm -rf scripts/plock/assets/scenes scripts/plock/assets/.tmp
npx tsx scripts/plock/compose-scenes-v3.ts

echo "━━━ 5/5 영상 4편 재빌드 ━━━"
npx tsx scripts/plock/build-videos.ts

echo "✓ Post-rebrand pipeline complete."
