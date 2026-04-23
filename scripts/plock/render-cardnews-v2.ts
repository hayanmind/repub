/**
 * Upgraded card news renderer v2.
 * Dark themes, category-based palettes, mesh gradients, SVG decoration,
 * rich iconography, 10 layout templates.
 */
import { readFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer, { Browser } from 'puppeteer';
import type { CardSet, Slide } from './parse-cardnews.js';
import { getPalette, meshGradient, decorShapes, icon, type Palette } from './design-system.js';

const DATA_JSON = '/Users/jmoh/Workspace/gov-epub-2026/scripts/plock/cardnews.json';
const PNG_ROOT =
  '/Users/jmoh/Workspace/gov-epub-2026-docs/outsourcing/plock/결과물/산출물/01-카드뉴스/PNG';

// v2 render timestamp — used to decide what to re-render
const V2_RENDERED_AT = new Date('2026-04-22T01:00:00Z').getTime();

type Format = 'ig' | 'blog' | 'a4';
const FORMAT_SIZE: Record<Format, { w: number; h: number; dsf: number }> = {
  ig: { w: 1080, h: 1080, dsf: 1 },
  blog: { w: 1920, h: 1080, dsf: 1 },
  a4: { w: 827, h: 1170, dsf: 2 },
};

function esc(s?: string): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Template selection: broader palette than v1
type Tmpl = 'cover' | 'stat-hero' | 'split' | 'quote' | 'flow' | 'list' | 'compare' | 'icon-grid' | 'cta' | 'text-hero';

function pickTemplate(slide: Slide, idx: number, total: number): Tmpl {
  const body = (slide.body ?? '') + ' ' + slide.title;
  if (idx === 1) return 'cover';
  if (idx === total) return 'cta';
  if (slide.stat && /(\d)/.test(slide.stat.number)) return 'stat-hero';
  if (slide.bullets && slide.bullets.length >= 3) return 'list';
  if (/vs|대비|BEFORE|AFTER|전후|비교/i.test(body)) return 'compare';
  if (/단계|프로세스|흐름|순서|먼저|다음|마지막/.test(body)) return 'flow';
  if (/\?|인가요|어떠세요|아시나요/.test(slide.title)) return 'quote';
  if (/(출판사|교육|도서관|공공)/.test(body)) return 'icon-grid';
  // fallback alternation for variety
  return ['split', 'text-hero', 'split'][(idx - 2) % 3] as Tmpl;
}

function iconByCategory(cat: string, variant: number): string {
  const map: Record<string, string[]> = {
    '01-서비스소개': ['sparkles', 'book', 'play', 'layers'],
    '02-기술차별점': ['zap', 'code', 'shield', 'target'],
    '03-활용사례': ['users', 'book', 'globe', 'layers'],
    '04-도입가이드': ['settings', 'arrow', 'clock', 'code'],
    '05-시장트렌드': ['trending', 'globe', 'users', 'target'],
  };
  const ics = map[cat] ?? ['sparkles'];
  return ics[variant % ics.length];
}

function splitTitle(title: string): [string, string | null] {
  // Try to break after a comma or Korean phrase break for large display
  const m = title.match(/^(.{3,18}[,.·—])\s+(.+)$/);
  if (m) return [m[1], m[2]];
  // Otherwise wrap at ~18 chars
  if (title.length > 20) {
    const mid = Math.floor(title.length / 2);
    for (let off = 0; off < 6; off++) {
      if (title[mid + off] === ' ') return [title.slice(0, mid + off), title.slice(mid + off + 1)];
      if (title[mid - off] === ' ') return [title.slice(0, mid - off), title.slice(mid - off + 1)];
    }
  }
  return [title, null];
}

function layoutHtml(tmpl: Tmpl, slide: Slide, set: CardSet, p: Palette, decorVariant: string, fmtFlags: { sq: boolean; port: boolean }): string {
  const [t1, t2] = splitTitle(slide.title);
  const { sq, port } = fmtFlags;
  const catCode = `C${String(set.categoryIdx).padStart(2, '0')}`;
  const iconName = iconByCategory(`0${set.categoryIdx}-${set.category.replace(/\s+/g, '')}`.slice(0, 3) + '-서비스소개'.slice(-5), slide.idx);
  // Use palette-keyed icon instead
  const catDir = `${String(set.categoryIdx).padStart(2, '0')}-${set.category.replace(/\s+/g, '')}`;
  const ic = iconByCategory(catDir, slide.idx);

  const titleXL = sq ? 108 : port ? 84 : 120;
  const titleLG = sq ? 76 : port ? 60 : 88;
  const titleMD = sq ? 58 : port ? 46 : 66;
  const bodyFS = sq ? 24 : port ? 20 : 26;

  switch (tmpl) {
    case 'cover': {
      return `
        <div class="layout layout-cover">
          <div class="cover-accent">
            ${icon(ic, sq ? 96 : 120, p.accent, 2)}
          </div>
          <h1 class="title" style="font-size:${titleXL}px;font-weight:800;line-height:1.05;letter-spacing:-0.03em;">
            <span class="hl-bar"></span>
            <span>${esc(t1)}</span>
            ${t2 ? `<br/><span class="accent">${esc(t2)}</span>` : ''}
          </h1>
          ${slide.subtitle ? `<p class="subtitle-lg" style="font-size:${sq ? 30 : port ? 24 : 34}px;">${esc(slide.subtitle)}</p>` : ''}
        </div>`;
    }
    case 'stat-hero': {
      const num = slide.stat?.number ?? '';
      const label = slide.stat?.label ?? slide.title;
      return `
        <div class="layout layout-stat">
          <div class="stat-label" style="font-size:${sq ? 24 : port ? 20 : 26}px;">${esc(slide.title)}</div>
          <div class="stat-number" style="font-size:${sq ? 280 : port ? 220 : 340}px;">
            ${esc(num)}
          </div>
          <p class="stat-desc" style="font-size:${bodyFS}px;">${esc(slide.body ?? label)}</p>
        </div>`;
    }
    case 'split': {
      return `
        <div class="layout layout-split">
          <div class="split-left">
            <div class="chip">${esc(set.category)}</div>
            <h2 class="title" style="font-size:${titleLG}px;font-weight:800;line-height:1.12;">${esc(slide.title)}</h2>
            ${slide.body ? `<p class="body" style="font-size:${bodyFS}px;">${esc(slide.body)}</p>` : ''}
          </div>
          <div class="split-right">
            <div class="icon-stage">
              ${icon(ic, sq ? 160 : port ? 120 : 220, p.accent, 1.6)}
              <div class="icon-ring"></div>
              <div class="icon-ring-2"></div>
            </div>
          </div>
        </div>`;
    }
    case 'quote': {
      return `
        <div class="layout layout-quote">
          <div class="quote-mark">"</div>
          <h2 class="title" style="font-size:${titleLG}px;font-weight:700;line-height:1.2;">${esc(slide.title)}</h2>
          ${slide.body ? `<p class="body" style="font-size:${bodyFS}px;">${esc(slide.body)}</p>` : ''}
        </div>`;
    }
    case 'flow': {
      const steps = slide.bullets ?? (slide.body ?? '').split(/[.,·]/).map((s) => s.trim()).filter((s) => s.length >= 3 && s.length <= 20).slice(0, 4);
      const items = steps.length >= 3 ? steps : ['입력', 'AI 분석', '변환', '완성'];
      return `
        <div class="layout layout-flow">
          <h2 class="title" style="font-size:${titleMD}px;font-weight:700;">${esc(slide.title)}</h2>
          <div class="flow-chain">
            ${items
              .slice(0, 5)
              .map(
                (s, i) => `
              <div class="flow-node ${i === Math.floor(items.length / 2) ? 'flow-node-active' : ''}">
                <div class="flow-num">${i + 1}</div>
                <div class="flow-label">${esc(s)}</div>
              </div>
              ${i < Math.min(items.length, 5) - 1 ? '<div class="flow-line"></div>' : ''}`,
              )
              .join('')}
          </div>
          ${slide.body ? `<p class="body" style="font-size:${bodyFS}px;">${esc(slide.body)}</p>` : ''}
        </div>`;
    }
    case 'list': {
      return `
        <div class="layout layout-list">
          <h2 class="title" style="font-size:${titleMD}px;font-weight:700;">${esc(slide.title)}</h2>
          <ul class="rich-list">
            ${(slide.bullets ?? []).slice(0, 5).map((b, i) => `
              <li>
                <span class="list-num">${String(i + 1).padStart(2, '0')}</span>
                <span class="list-text" style="font-size:${sq ? 26 : port ? 22 : 28}px;">${esc(b)}</span>
              </li>`).join('')}
          </ul>
        </div>`;
    }
    case 'compare': {
      return `
        <div class="layout layout-compare">
          <h2 class="title" style="font-size:${titleMD}px;font-weight:700;">${esc(slide.title)}</h2>
          <div class="compare-grid">
            <div class="compare-card compare-before">
              <div class="compare-tag">BEFORE</div>
              <div class="compare-big">ePub 2.0</div>
              <ul><li>수작업 구조화</li><li>접근성 미흡</li><li>인터랙션 없음</li></ul>
            </div>
            <div class="compare-arrow">${icon('arrow', sq ? 48 : 64, p.accent, 3)}</div>
            <div class="compare-card compare-after">
              <div class="compare-tag compare-tag-after">AFTER</div>
              <div class="compare-big">ePub 3.0</div>
              <ul><li>AI 자동 구조화</li><li>KWCAG 97.9%</li><li>퀴즈·TTS·팝업</li></ul>
            </div>
          </div>
          ${slide.body ? `<p class="body" style="font-size:${bodyFS}px;">${esc(slide.body)}</p>` : ''}
        </div>`;
    }
    case 'icon-grid': {
      const items = [
        { ic: 'book', label: '출판사' },
        { ic: 'users', label: '교육기관' },
        { ic: 'database', label: '도서관' },
        { ic: 'shield', label: '공공기관' },
      ];
      return `
        <div class="layout layout-icongrid">
          <h2 class="title" style="font-size:${titleMD}px;font-weight:700;">${esc(slide.title)}</h2>
          <div class="icon-grid">
            ${items.map((it) => `
              <div class="ig-card">
                <div class="ig-icon">${icon(it.ic, sq ? 48 : 64, p.accent, 1.8)}</div>
                <div class="ig-label">${esc(it.label)}</div>
              </div>`).join('')}
          </div>
          ${slide.body ? `<p class="body" style="font-size:${bodyFS}px;">${esc(slide.body)}</p>` : ''}
        </div>`;
    }
    case 'cta': {
      return `
        <div class="layout layout-cta">
          <div class="cta-symbol">${icon('sparkles', sq ? 84 : 120, p.highlight, 2)}</div>
          <h2 class="title" style="font-size:${titleLG}px;font-weight:800;line-height:1.1;">${esc(slide.title)}</h2>
          ${slide.subtitle ? `<p class="subtitle-lg" style="font-size:${sq ? 26 : port ? 22 : 30}px;">${esc(slide.subtitle)}</p>` : ''}
          <div class="cta-btn">
            시작하기
            <span class="cta-arrow">${icon('arrow', 26, p.ink, 2.5)}</span>
          </div>
          <div class="cta-url">epub-remastering.hayanmind.com</div>
        </div>`;
    }
    case 'text-hero':
    default: {
      return `
        <div class="layout layout-texthero">
          <div class="chip">${esc(set.category)} · ${catCode}</div>
          <h2 class="title" style="font-size:${titleLG}px;font-weight:800;line-height:1.1;letter-spacing:-0.02em;">
            <span class="hl-bar"></span>
            ${esc(slide.title)}
          </h2>
          ${slide.body ? `<p class="body" style="font-size:${bodyFS}px;max-width:85%;">${esc(slide.body)}</p>` : ''}
        </div>`;
    }
  }
}

function renderSlideHtml(slide: Slide, set: CardSet, format: Format, totalSlides: number): string {
  const size = FORMAT_SIZE[format];
  const catDir = `${String(set.categoryIdx).padStart(2, '0')}-${set.category.replace(/\s+/g, '')}`;
  const p = getPalette(catDir);
  const tmpl = pickTemplate(slide, slide.idx, totalSlides);
  const sq = format === 'ig';
  const port = format === 'a4';

  // Pick decor variant per template for variety
  const decorMap: Record<Tmpl, 'orbs' | 'lines' | 'grid' | 'dots' | 'waves'> = {
    cover: 'orbs',
    'stat-hero': 'lines',
    split: 'dots',
    quote: 'waves',
    flow: 'grid',
    list: 'dots',
    compare: 'lines',
    'icon-grid': 'grid',
    cta: 'orbs',
    'text-hero': 'dots',
  };
  const decorVar = decorMap[tmpl];
  const seed = set.categoryIdx * 100 + set.setIdx * 10 + slide.idx;
  const mesh = meshGradient(p, seed, size.w, size.h);
  const decor = decorShapes(p, seed, decorVar);
  const layoutBody = layoutHtml(tmpl, slide, set, p, decorVar, { sq, port });

  const pad = sq ? '110px' : port ? '110px 95px' : '110px 140px';
  const pageCode = `${String(slide.idx).padStart(2, '0')} · ${totalSlides}`;
  const setCode = `C${String(set.categoryIdx).padStart(2, '0')}-S${String(set.setIdx).padStart(2, '0')}`;

  return `<!DOCTYPE html>
<html lang="ko"><head>
<meta charset="UTF-8">
<style>
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
* { margin: 0; padding: 0; box-sizing: border-box; }

html, body {
  width: ${size.w}px;
  height: ${size.h}px;
  overflow: hidden;
  font-family: 'Pretendard Variable', -apple-system, sans-serif;
  background: ${p.bg};
  color: ${p.ink};
  font-weight: 500;
  -webkit-font-smoothing: antialiased;
}

.stage {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.bg-mesh, .bg-decor {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.content {
  position: relative;
  z-index: 10;
  width: 100%;
  height: 100%;
  padding: ${pad};
  display: flex;
  flex-direction: column;
}

.layout { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 28px; }

/* Title / body base */
.title { color: ${p.ink}; }
.title .accent { color: ${p.accent}; }
.title .hl-bar {
  display: inline-block;
  width: 72px;
  height: 6px;
  background: ${p.accent};
  border-radius: 4px;
  margin-bottom: 36px;
  box-shadow: 0 0 24px ${p.accent}55;
}
.subtitle-lg { color: ${p.inkSoft}; margin-top: 20px; line-height: 1.5; font-weight: 500; }
.body { color: ${p.inkSoft}; line-height: 1.7; font-weight: 400; }
.chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: ${p.accent}22;
  color: ${p.accent};
  border: 1px solid ${p.accent}55;
  border-radius: 999px;
  font-size: ${sq ? 18 : 16}px;
  font-weight: 700;
  letter-spacing: 0.04em;
  width: fit-content;
  margin-bottom: 16px;
  backdrop-filter: blur(8px);
}

/* Brand footer (subtle, category+slide ident only, no HAYANMIND text) */
.footer {
  position: absolute;
  bottom: ${port ? 50 : 60}px;
  left: ${port ? 95 : sq ? 110 : 140}px;
  right: ${port ? 95 : sq ? 110 : 140}px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: ${p.inkSoft};
  font-size: ${sq ? 13 : 14}px;
  letter-spacing: 0.12em;
  font-variant-numeric: tabular-nums;
  opacity: 0.7;
  z-index: 11;
}
.footer-category {
  color: ${p.accent};
  font-weight: 700;
}

/* === Cover === */
.layout-cover { justify-content: center; gap: 24px; }
.cover-accent { opacity: 0.9; margin-bottom: 20px; filter: drop-shadow(0 4px 28px ${p.accent}88); }

/* === Stat Hero === */
.layout-stat { justify-content: center; text-align: left; gap: 18px; }
.stat-label {
  color: ${p.inkSoft};
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.stat-number {
  font-weight: 900;
  background: linear-gradient(135deg, ${p.accent} 0%, ${p.highlight} 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  line-height: 0.95;
  letter-spacing: -0.05em;
  text-shadow: 0 0 64px ${p.accent}55;
}
.stat-desc {
  color: ${p.ink};
  line-height: 1.6;
  max-width: 80%;
  margin-top: 16px;
  font-weight: 500;
}

/* === Split === */
.layout-split { flex-direction: row; align-items: center; gap: 80px; }
.split-left { flex: 1.2; display: flex; flex-direction: column; gap: 24px; }
.split-right { flex: 1; display: flex; justify-content: center; align-items: center; }
.icon-stage {
  position: relative;
  width: ${sq ? '70%' : '60%'};
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, ${p.accent}22, ${p.accentDeep}11);
  border-radius: 50%;
  box-shadow: 0 8px 80px ${p.accent}44, inset 0 0 120px ${p.accent}22;
}
.icon-ring {
  position: absolute;
  inset: -10%;
  border: 2px dashed ${p.accent}66;
  border-radius: 50%;
}
.icon-ring-2 {
  position: absolute;
  inset: -24%;
  border: 1px solid ${p.accent}33;
  border-radius: 50%;
}

/* === Quote === */
.layout-quote { justify-content: center; gap: 32px; padding: 0 ${sq ? '0' : '8%'}; }
.quote-mark {
  font-size: ${sq ? 240 : 320}px;
  color: ${p.accent}44;
  line-height: 0.5;
  font-family: Georgia, serif;
  font-weight: 700;
  margin-bottom: -20px;
}

/* === Flow === */
.layout-flow { justify-content: center; gap: 44px; }
.flow-chain { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-top: 12px; }
.flow-node {
  background: ${p.bgAlt};
  border: 1px solid ${p.accent}33;
  border-radius: 20px;
  padding: 22px 28px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  min-width: ${sq ? 150 : 180}px;
  backdrop-filter: blur(6px);
}
.flow-node-active {
  background: linear-gradient(135deg, ${p.accent} 0%, ${p.accentDeep} 100%);
  box-shadow: 0 16px 60px ${p.accent}66;
  border: none;
}
.flow-node-active .flow-num, .flow-node-active .flow-label { color: white; }
.flow-num {
  font-size: ${sq ? 18 : 20}px;
  font-weight: 800;
  color: ${p.accent};
  letter-spacing: 0.1em;
}
.flow-label { font-size: ${sq ? 22 : 24}px; font-weight: 600; color: ${p.ink}; line-height: 1.3; }
.flow-line {
  flex: 0 0 ${sq ? 24 : 36}px;
  height: 2px;
  background: linear-gradient(90deg, ${p.accent}, ${p.accent}22);
}

/* === List === */
.layout-list { gap: 36px; }
.rich-list { list-style: none; display: flex; flex-direction: column; gap: 22px; }
.rich-list li {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  padding: 18px 28px;
  background: ${p.bgAlt}aa;
  border-left: 4px solid ${p.accent};
  border-radius: 6px;
  backdrop-filter: blur(4px);
}
.list-num {
  font-size: ${sq ? 28 : 32}px;
  font-weight: 800;
  color: ${p.accent};
  font-variant-numeric: tabular-nums;
  min-width: ${sq ? 52 : 60}px;
}
.list-text {
  color: ${p.ink};
  line-height: 1.5;
  flex: 1;
}

/* === Compare === */
.layout-compare { gap: 32px; }
.compare-grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 32px;
  align-items: center;
  margin-top: 24px;
}
.compare-card {
  padding: 36px 32px;
  border-radius: 20px;
  backdrop-filter: blur(8px);
}
.compare-before {
  background: ${p.bgAlt}aa;
  border: 1px solid ${p.inkSoft}22;
  opacity: 0.8;
}
.compare-after {
  background: linear-gradient(135deg, ${p.accent}33, ${p.accentDeep}22);
  border: 2px solid ${p.accent};
  box-shadow: 0 20px 80px ${p.accent}33;
}
.compare-tag {
  display: inline-block;
  padding: 6px 16px;
  background: ${p.inkSoft}22;
  color: ${p.inkSoft};
  border-radius: 999px;
  font-size: ${sq ? 14 : 16}px;
  font-weight: 800;
  letter-spacing: 0.15em;
  margin-bottom: 18px;
}
.compare-tag-after { background: ${p.accent}; color: ${p.bg}; }
.compare-big { font-size: ${sq ? 36 : 44}px; font-weight: 800; color: ${p.ink}; margin-bottom: 18px; }
.compare-card ul { list-style: none; display: flex; flex-direction: column; gap: 8px; }
.compare-card li {
  font-size: ${sq ? 18 : 20}px;
  color: ${p.inkSoft};
  padding-left: 20px;
  position: relative;
}
.compare-card li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: ${p.accent};
  font-weight: 800;
}
.compare-arrow { display: flex; align-items: center; justify-content: center; }

/* === Icon Grid === */
.layout-icongrid { gap: 36px; }
.icon-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px;
}
.ig-card {
  padding: ${sq ? 28 : 36}px;
  background: ${p.bgAlt}aa;
  border: 1px solid ${p.accent}33;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  backdrop-filter: blur(8px);
}
.ig-icon {
  width: ${sq ? 64 : 80}px;
  height: ${sq ? 64 : 80}px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${p.accent}22;
  border-radius: 16px;
}
.ig-label {
  font-size: ${sq ? 22 : 26}px;
  font-weight: 700;
  color: ${p.ink};
}

/* === CTA === */
.layout-cta { justify-content: center; align-items: flex-start; gap: 22px; }
.cta-symbol { margin-bottom: 16px; filter: drop-shadow(0 0 30px ${p.highlight}88); }
.cta-btn {
  margin-top: 28px;
  display: inline-flex;
  align-items: center;
  gap: 16px;
  padding: 22px 44px;
  background: linear-gradient(135deg, ${p.accent}, ${p.accentDeep});
  color: white;
  font-size: ${sq ? 26 : 30}px;
  font-weight: 800;
  border-radius: 999px;
  box-shadow: 0 16px 60px ${p.accent}66;
}
.cta-btn .cta-arrow { display: flex; align-items: center; }
.cta-url {
  margin-top: 16px;
  font-size: ${sq ? 20 : 22}px;
  color: ${p.inkSoft};
  letter-spacing: 0.08em;
}

/* Text hero */
.layout-texthero { justify-content: center; gap: 24px; }

</style></head>
<body>
  <div class="stage">
    <div class="bg-mesh">${mesh}</div>
    <div class="bg-decor">${decor}</div>
    <div class="content">
      ${layoutBody}
    </div>
    <div class="footer">
      <span class="footer-category">${esc(set.category).toUpperCase()}</span>
      <span>${pageCode}</span>
    </div>
  </div>
</body></html>`;
}

async function renderOne(
  browser: Browser,
  slide: Slide,
  set: CardSet,
  format: Format,
  totalSlides: number,
  outPath: string,
): Promise<'rendered' | 'skipped'> {
  if (existsSync(outPath)) {
    const mtime = statSync(outPath).mtimeMs;
    if (mtime >= V2_RENDERED_AT) return 'skipped';
  }
  const size = FORMAT_SIZE[format];
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(120000);
  page.setDefaultTimeout(120000);
  await page.setViewport({ width: size.w, height: size.h, deviceScaleFactor: size.dsf });
  const html = renderSlideHtml(slide, set, format, totalSlides);
  await page.setContent(html, { waitUntil: 'load', timeout: 120000 });
  await Promise.race([page.evaluateHandle('document.fonts.ready'), new Promise((r) => setTimeout(r, 3000))]);
  await page.screenshot({ path: outPath as `${string}.png`, type: 'png' });
  await page.close();
  return 'rendered';
}

async function main() {
  const onlySet = process.env.ONLY_SET; // "01-서비스소개/세트1-ePub30변환_클릭한번"
  const data = JSON.parse(readFileSync(DATA_JSON, 'utf8')) as { sets: CardSet[] };
  const formats: Format[] = ['ig', 'blog', 'a4'];

  const browser = await puppeteer.launch({ headless: true });
  const t0 = Date.now();
  let done = 0;
  let rendered = 0;
  let skipped = 0;

  let targetSets = data.sets;
  if (onlySet) {
    targetSets = data.sets.filter((s) => `${String(s.categoryIdx).padStart(2, '0')}-${s.category.replace(/\s+/g, '')}/${s.setName}` === onlySet);
    console.log(`Filter: ${onlySet} → ${targetSets.length} sets`);
  }

  const total = targetSets.reduce((n, s) => n + s.slides.length, 0) * formats.length;

  for (const set of targetSets) {
    const catDir = `${String(set.categoryIdx).padStart(2, '0')}-${set.category.replace(/\s+/g, '')}`;
    const setDir = join(PNG_ROOT, catDir, set.setName);
    mkdirSync(setDir, { recursive: true });

    for (const slide of set.slides) {
      for (const format of formats) {
        const file = `${String(slide.idx).padStart(2, '0')}-${format}.png`;
        const outPath = join(setDir, file);
        const r = await renderOne(browser, slide, set, format, set.slides.length, outPath);
        done++;
        if (r === 'rendered') rendered++;
        else skipped++;
        if (done % 10 === 0 || done === total) {
          const elapsed = (Date.now() - t0) / 1000;
          const rate = done / elapsed;
          const eta = (total - done) / Math.max(rate, 0.01);
          process.stdout.write(`\r  ${done}/${total}  rendered=${rendered} skipped=${skipped}  ${rate.toFixed(1)}/s  ETA ${Math.round(eta)}s     `);
        }
      }
    }
  }

  await browser.close();
  console.log(`\n\n✓ Done in ${((Date.now() - t0) / 1000).toFixed(1)}s — ${rendered} rendered, ${skipped} skipped`);
  console.log(`  → ${PNG_ROOT}\n`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
