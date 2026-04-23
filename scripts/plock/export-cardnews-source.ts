/**
 * Export card news HTML/CSS source bundle (editable alternative to AI/PSD/Figma).
 *
 * For each slide: save the rendered HTML file (with embedded background) so that
 * it can be re-opened in any browser and re-edited. Also emit a per-set README
 * and copy the raw background JPG to an `assets/` subfolder so the HTML bundle
 * is self-contained.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import type { CardSet, Slide } from './parse-cardnews.js';
import { getPalette, icon, type Palette } from './design-system.js';

const DATA_JSON = '/Users/jmoh/Workspace/gov-epub-2026/scripts/plock/cardnews.json';
const OUT_ROOT =
  '/Users/jmoh/Workspace/gov-epub-2026-docs/outsourcing/plock/결과물/산출물/편집원본/카드뉴스/HTML';
const SVG_ROOT =
  '/Users/jmoh/Workspace/gov-epub-2026-docs/outsourcing/plock/결과물/산출물/편집원본/카드뉴스/SVG';
const BG_ROOT = '/Users/jmoh/Workspace/gov-epub-2026/scripts/plock/assets/bg';

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

function backgroundFor(set: CardSet, slide: Slide): string {
  const catDir = `${String(set.categoryIdx).padStart(2, '0')}-${set.category.replace(/\s+/g, '')}`;
  const slidePath = join(BG_ROOT, 'slides', catDir, set.setName, `${String(slide.idx).padStart(2, '0')}.jpg`);
  if (existsSync(slidePath)) return slidePath;
  const bgIdx = ((set.setIdx + slide.idx) % 3) + 1;
  const catPath = join(BG_ROOT, catDir, `${bgIdx}.jpg`);
  if (existsSync(catPath)) return catPath;
  for (let i = 1; i <= 3; i++) {
    const p = join(BG_ROOT, catDir, `${i}.jpg`);
    if (existsSync(p)) return p;
  }
  return '';
}

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
  return ['split', 'text-hero', 'split'][(idx - 2) % 3] as Tmpl;
}

function iconByCategory(catDir: string, variant: number): string {
  const map: Record<string, string[]> = {
    '01-서비스소개': ['sparkles', 'book', 'play', 'layers'],
    '02-기술차별점': ['zap', 'code', 'shield', 'target'],
    '03-활용사례': ['users', 'book', 'globe', 'layers'],
    '04-도입가이드': ['settings', 'arrow', 'clock', 'code'],
    '05-시장트렌드': ['trending', 'globe', 'users', 'target'],
  };
  const ics = map[catDir] ?? ['sparkles'];
  return ics[variant % ics.length];
}

function splitTitle(title: string): [string, string | null] {
  const m = title.match(/^(.{3,18}[,.·—])\s+(.+)$/);
  if (m) return [m[1], m[2]];
  if (title.length > 20) {
    const mid = Math.floor(title.length / 2);
    for (let off = 0; off < 6; off++) {
      if (title[mid + off] === ' ') return [title.slice(0, mid + off), title.slice(mid + off + 1)];
      if (title[mid - off] === ' ') return [title.slice(0, mid - off), title.slice(mid - off + 1)];
    }
  }
  return [title, null];
}

function layoutHtml(tmpl: Tmpl, slide: Slide, set: CardSet, p: Palette, fmtFlags: { sq: boolean; port: boolean }): string {
  const [t1, t2] = splitTitle(slide.title);
  const { sq, port } = fmtFlags;
  const catDir = `${String(set.categoryIdx).padStart(2, '0')}-${set.category.replace(/\s+/g, '')}`;
  const ic = iconByCategory(catDir, slide.idx);
  const titleXL = sq ? 108 : port ? 84 : 120;
  const titleLG = sq ? 76 : port ? 60 : 88;
  const titleMD = sq ? 58 : port ? 46 : 66;
  const bodyFS = sq ? 24 : port ? 20 : 26;

  switch (tmpl) {
    case 'cover':
      return `
        <div class="layout layout-cover">
          <div class="chip">${esc(set.category)}</div>
          <h1 class="title" style="font-size:${titleXL}px;font-weight:800;line-height:1.02;letter-spacing:-0.03em;">
            <span class="hl-bar"></span>
            <span>${esc(t1)}</span>
            ${t2 ? `<br/><span class="accent">${esc(t2)}</span>` : ''}
          </h1>
          ${slide.subtitle ? `<p class="subtitle-lg" style="font-size:${sq ? 30 : port ? 24 : 34}px;">${esc(slide.subtitle)}</p>` : ''}
        </div>`;
    case 'stat-hero':
      return `
        <div class="layout layout-stat">
          <div class="stat-label" style="font-size:${sq ? 24 : port ? 20 : 26}px;">${esc(slide.title)}</div>
          <div class="stat-number" style="font-size:${sq ? 280 : port ? 220 : 340}px;">
            ${esc(slide.stat?.number ?? '')}
          </div>
          <p class="stat-desc" style="font-size:${bodyFS}px;">${esc(slide.body ?? slide.title)}</p>
        </div>`;
    case 'split':
      return `
        <div class="layout layout-split">
          <div class="split-left">
            <div class="chip">${esc(set.category)}</div>
            <h2 class="title" style="font-size:${titleLG}px;font-weight:800;line-height:1.12;">${esc(slide.title)}</h2>
            ${slide.body ? `<p class="body" style="font-size:${bodyFS}px;">${esc(slide.body)}</p>` : ''}
          </div>
          <div class="split-right">
            <div class="icon-pill">${icon(ic, sq ? 120 : port ? 100 : 180, p.accent, 1.8)}</div>
          </div>
        </div>`;
    case 'quote':
      return `
        <div class="layout layout-quote">
          <div class="quote-mark">"</div>
          <h2 class="title" style="font-size:${titleLG}px;font-weight:700;line-height:1.2;">${esc(slide.title)}</h2>
          ${slide.body ? `<p class="body" style="font-size:${bodyFS}px;">${esc(slide.body)}</p>` : ''}
        </div>`;
    case 'flow': {
      const steps = slide.bullets ?? (slide.body ?? '').split(/[.,·]/).map((s) => s.trim()).filter((s) => s.length >= 3 && s.length <= 20).slice(0, 4);
      const items = steps.length >= 3 ? steps : ['입력', 'AI 분석', '변환', '완성'];
      return `
        <div class="layout layout-flow">
          <h2 class="title" style="font-size:${titleMD}px;font-weight:700;">${esc(slide.title)}</h2>
          <div class="flow-chain">
            ${items.slice(0, 5).map((s, i) => `
              <div class="flow-node ${i === Math.floor(items.length / 2) ? 'flow-node-active' : ''}">
                <div class="flow-num">${i + 1}</div>
                <div class="flow-label">${esc(s)}</div>
              </div>
              ${i < Math.min(items.length, 5) - 1 ? '<div class="flow-line"></div>' : ''}`).join('')}
          </div>
          ${slide.body ? `<p class="body" style="font-size:${bodyFS}px;">${esc(slide.body)}</p>` : ''}
        </div>`;
    }
    case 'list':
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
    case 'compare':
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
    case 'cta':
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
    case 'text-hero':
    default:
      return `
        <div class="layout layout-texthero">
          <div class="chip">${esc(set.category)}</div>
          <h2 class="title" style="font-size:${titleLG}px;font-weight:800;line-height:1.1;letter-spacing:-0.02em;">
            <span class="hl-bar"></span>
            ${esc(slide.title)}
          </h2>
          ${slide.body ? `<p class="body" style="font-size:${bodyFS}px;max-width:85%;">${esc(slide.body)}</p>` : ''}
        </div>`;
  }
}

/**
 * Render the slide as standalone HTML with **relative** `assets/` reference
 * (so the folder is portable). Nearly identical to render-cardnews-v3.ts but
 * uses a URL link instead of embedding base64.
 */
function renderSlideHtml(slide: Slide, set: CardSet, format: Format, totalSlides: number, bgFileName: string): string {
  const size = FORMAT_SIZE[format];
  const catDir = `${String(set.categoryIdx).padStart(2, '0')}-${set.category.replace(/\s+/g, '')}`;
  const p = getPalette(catDir);
  const tmpl = pickTemplate(slide, slide.idx, totalSlides);
  const sq = format === 'ig';
  const port = format === 'a4';
  const bgUrl = bgFileName ? `./assets/${bgFileName}` : '';
  const pad = sq ? '110px' : port ? '110px 95px' : '110px 140px';
  const pageCode = `${String(slide.idx).padStart(2, '0')} · ${totalSlides}`;
  const layoutBody = layoutHtml(tmpl, slide, set, p, { sq, port });
  const useSplitAlign = tmpl === 'split';

  return `<!DOCTYPE html>
<html lang="ko"><head>
<meta charset="UTF-8">
<title>${esc(set.title)} — ${String(slide.idx).padStart(2, '0')} (${format})</title>
<meta name="slide-set" content="${esc(set.setName)}">
<meta name="slide-template" content="${tmpl}">
<meta name="format" content="${format}">
<style>
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body {
  width: ${size.w}px; height: ${size.h}px; overflow: hidden;
  font-family: 'Pretendard Variable', -apple-system, sans-serif;
  background: ${p.bg}; color: ${p.ink}; font-weight: 500;
  -webkit-font-smoothing: antialiased;
}
.stage { position: relative; width: 100%; height: 100%; overflow: hidden; }
.bg-img { position: absolute; inset: 0; z-index: 1;
  background-image: url('${bgUrl}'); background-size: cover; background-position: center;
  filter: saturate(1.05) contrast(0.98); }
.overlay-base { position: absolute; inset: 0; z-index: 2;
  background:
    linear-gradient(180deg, ${p.bg}00 0%, ${p.bg}33 45%, ${p.bg}dd 100%),
    linear-gradient(90deg, ${p.bg}ee 0%, ${p.bg}99 30%, ${p.bg}44 60%, ${p.bg}00 100%);
  ${useSplitAlign ? '' : ''} }
.overlay-tint { position: absolute; inset: 0; z-index: 3;
  background: radial-gradient(ellipse at 20% 30%, ${p.accent}33 0%, transparent 60%),
              radial-gradient(ellipse at 80% 80%, ${p.meshC}22 0%, transparent 50%);
  mix-blend-mode: screen; }
.overlay-vignette { position: absolute; inset: 0; z-index: 4;
  background: radial-gradient(ellipse at 50% 50%, transparent 50%, ${p.bg}77 100%); }
.content { position: relative; z-index: 10; width: 100%; height: 100%;
  padding: ${pad}; display: flex; flex-direction: column; }
.layout { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 28px; }
.title { color: ${p.ink}; text-shadow: 0 2px 32px rgba(0,0,0,0.5); }
.title .accent { color: ${p.accent}; text-shadow: 0 0 40px ${p.accent}88; }
.title .hl-bar { display: inline-block; width: 72px; height: 6px;
  background: ${p.accent}; border-radius: 4px; margin-bottom: 36px;
  box-shadow: 0 0 32px ${p.accent}; }
.subtitle-lg { color: ${p.inkSoft}; margin-top: 20px; line-height: 1.5;
  font-weight: 500; text-shadow: 0 2px 16px rgba(0,0,0,0.7); }
.body { color: ${p.ink}; line-height: 1.7; font-weight: 400;
  text-shadow: 0 2px 12px rgba(0,0,0,0.7); opacity: 0.9; }
.chip { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px;
  background: rgba(255,255,255,0.08); color: ${p.accentSoft};
  border: 1px solid ${p.accent}88; border-radius: 999px;
  font-size: ${sq ? 18 : 16}px; font-weight: 700; letter-spacing: 0.04em;
  width: fit-content; margin-bottom: 16px; backdrop-filter: blur(10px);
  text-shadow: 0 2px 8px rgba(0,0,0,0.5); }
.footer { position: absolute; bottom: ${port ? 50 : 60}px;
  left: ${port ? 95 : sq ? 110 : 140}px; right: ${port ? 95 : sq ? 110 : 140}px;
  display: flex; justify-content: space-between; align-items: center;
  color: ${p.ink}; font-size: ${sq ? 13 : 14}px;
  letter-spacing: 0.12em; font-variant-numeric: tabular-nums;
  opacity: 0.7; z-index: 11; text-shadow: 0 2px 8px rgba(0,0,0,0.7); }
.footer-category { color: ${p.accent}; font-weight: 700; }
.layout-cover { justify-content: flex-end; gap: 24px; padding-bottom: 8%; }
.layout-stat { justify-content: center; text-align: left; gap: 18px; }
.stat-label { color: ${p.accentSoft}; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }
.stat-number { font-weight: 900;
  background: linear-gradient(135deg, ${p.accent} 0%, ${p.highlight} 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  line-height: 0.95; letter-spacing: -0.05em;
  filter: drop-shadow(0 0 60px ${p.accent}aa); }
.stat-desc { color: ${p.ink}; line-height: 1.6; max-width: 80%; margin-top: 16px; font-weight: 500; }
.layout-split { flex-direction: row; align-items: center; gap: 60px; }
.split-left { flex: 1.3; display: flex; flex-direction: column; gap: 20px; }
.split-right { flex: 1; display: flex; justify-content: center; align-items: center; }
.icon-pill { position: relative; padding: 48px; background: rgba(255,255,255,0.06);
  border: 1px solid ${p.accent}44; border-radius: 36px; backdrop-filter: blur(16px);
  box-shadow: 0 20px 80px rgba(0,0,0,0.4), inset 0 0 60px ${p.accent}11; }
.layout-quote { justify-content: center; gap: 32px; padding: 0 ${sq ? '0' : '8%'}; }
.quote-mark { font-size: ${sq ? 240 : 320}px; color: ${p.accent}66;
  line-height: 0.5; font-family: Georgia, serif; font-weight: 700;
  margin-bottom: -20px; text-shadow: 0 0 60px ${p.accent}88; }
.layout-flow { justify-content: center; gap: 44px; }
.flow-chain { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-top: 12px; }
.flow-node { background: rgba(255,255,255,0.08); border: 1px solid ${p.accent}55;
  border-radius: 20px; padding: 22px 28px; display: flex; flex-direction: column;
  align-items: flex-start; gap: 10px; min-width: ${sq ? 150 : 180}px;
  backdrop-filter: blur(12px); }
.flow-node-active { background: linear-gradient(135deg, ${p.accent} 0%, ${p.accentDeep} 100%);
  box-shadow: 0 16px 60px ${p.accent}aa; border: none; }
.flow-node-active .flow-num, .flow-node-active .flow-label { color: white; }
.flow-num { font-size: ${sq ? 18 : 20}px; font-weight: 800; color: ${p.accent}; letter-spacing: 0.1em; }
.flow-label { font-size: ${sq ? 22 : 24}px; font-weight: 600; color: ${p.ink}; line-height: 1.3; }
.flow-line { flex: 0 0 ${sq ? 24 : 36}px; height: 2px;
  background: linear-gradient(90deg, ${p.accent}, ${p.accent}22); }
.layout-list { gap: 36px; }
.rich-list { list-style: none; display: flex; flex-direction: column; gap: 22px; }
.rich-list li { display: flex; align-items: flex-start; gap: 24px; padding: 20px 28px;
  background: rgba(255,255,255,0.07); border-left: 4px solid ${p.accent};
  border-radius: 6px; backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
.list-num { font-size: ${sq ? 28 : 32}px; font-weight: 800; color: ${p.accent};
  font-variant-numeric: tabular-nums; min-width: ${sq ? 52 : 60}px; }
.list-text { color: ${p.ink}; line-height: 1.5; flex: 1; }
.layout-compare { gap: 32px; }
.compare-grid { display: grid; grid-template-columns: 1fr auto 1fr; gap: 32px; align-items: center; margin-top: 24px; }
.compare-card { padding: 36px 32px; border-radius: 20px; backdrop-filter: blur(16px); }
.compare-before { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); opacity: 0.8; }
.compare-after { background: linear-gradient(135deg, ${p.accent}44, ${p.accentDeep}22);
  border: 2px solid ${p.accent}; box-shadow: 0 20px 80px ${p.accent}44; }
.compare-tag { display: inline-block; padding: 6px 16px;
  background: rgba(255,255,255,0.15); color: ${p.inkSoft};
  border-radius: 999px; font-size: ${sq ? 14 : 16}px; font-weight: 800;
  letter-spacing: 0.15em; margin-bottom: 18px; }
.compare-tag-after { background: ${p.accent}; color: ${p.bg}; }
.compare-big { font-size: ${sq ? 36 : 44}px; font-weight: 800; color: ${p.ink}; margin-bottom: 18px; }
.compare-card ul { list-style: none; display: flex; flex-direction: column; gap: 8px; }
.compare-card li { font-size: ${sq ? 18 : 20}px; color: ${p.inkSoft};
  padding-left: 20px; position: relative; }
.compare-card li::before { content: '•'; position: absolute; left: 0; color: ${p.accent}; font-weight: 800; }
.compare-arrow { display: flex; align-items: center; justify-content: center;
  filter: drop-shadow(0 0 12px ${p.accent}); }
.layout-icongrid { gap: 36px; }
.icon-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
.ig-card { padding: ${sq ? 28 : 36}px; background: rgba(255,255,255,0.08);
  border: 1px solid ${p.accent}44; border-radius: 20px;
  display: flex; flex-direction: column; gap: 16px; backdrop-filter: blur(12px); }
.ig-icon { width: ${sq ? 64 : 80}px; height: ${sq ? 64 : 80}px;
  display: flex; align-items: center; justify-content: center;
  background: ${p.accent}33; border-radius: 16px; }
.ig-label { font-size: ${sq ? 22 : 26}px; font-weight: 700; color: ${p.ink}; }
.layout-cta { justify-content: center; align-items: flex-start; gap: 22px; }
.cta-symbol { margin-bottom: 16px; filter: drop-shadow(0 0 40px ${p.highlight}); }
.cta-btn { margin-top: 28px; display: inline-flex; align-items: center; gap: 16px;
  padding: 22px 44px; background: linear-gradient(135deg, ${p.accent}, ${p.accentDeep});
  color: white; font-size: ${sq ? 26 : 30}px; font-weight: 800;
  border-radius: 999px; box-shadow: 0 20px 80px ${p.accent}88; }
.cta-btn .cta-arrow { display: flex; align-items: center; }
.cta-url { margin-top: 16px; font-size: ${sq ? 20 : 22}px; color: ${p.inkSoft};
  letter-spacing: 0.08em; text-shadow: 0 2px 8px rgba(0,0,0,0.6); }
.layout-texthero { justify-content: center; gap: 24px; }
</style></head>
<body>
  <div class="stage">
    ${bgUrl ? '<div class="bg-img"></div>' : ''}
    <div class="overlay-base"></div>
    <div class="overlay-tint"></div>
    <div class="overlay-vignette"></div>
    <div class="content">${layoutBody}</div>
    <div class="footer">
      <span class="footer-category">${esc(set.category).toUpperCase()}</span>
      <span>${pageCode}</span>
    </div>
  </div>
</body></html>`;
}

function renderSlideSvg(slide: Slide, set: CardSet, totalSlides: number, bgFileName: string): string {
  const size = FORMAT_SIZE['blog'];
  const catDir = `${String(set.categoryIdx).padStart(2, '0')}-${set.category.replace(/\s+/g, '')}`;
  const p = getPalette(catDir);
  const tmpl = pickTemplate(slide, slide.idx, totalSlides);
  const [t1, t2] = splitTitle(slide.title);
  const bgHref = bgFileName ? `../HTML/${catDir}/${set.setName}/assets/${bgFileName}` : '';
  const title = t2 ? `${t1} ${t2}` : t1;
  const body = slide.body ?? slide.subtitle ?? '';
  const pageCode = `${String(slide.idx).padStart(2, '0')} · ${totalSlides}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     viewBox="0 0 ${size.w} ${size.h}" width="${size.w}" height="${size.h}"
     data-set="${esc(set.setName)}" data-template="${tmpl}">
  <defs>
    <linearGradient id="grad-base" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${p.bg}" stop-opacity="0.0"/>
      <stop offset="45%" stop-color="${p.bg}" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="${p.bg}" stop-opacity="0.87"/>
    </linearGradient>
    <radialGradient id="grad-tint" cx="20%" cy="30%" r="60%">
      <stop offset="0%" stop-color="${p.accent}" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="${p.accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="${p.bg}"/>
  ${bgHref ? `<image href="${bgHref}" x="0" y="0" width="${size.w}" height="${size.h}" preserveAspectRatio="xMidYMid slice"/>` : ''}
  <rect width="100%" height="100%" fill="url(#grad-base)"/>
  <rect width="100%" height="100%" fill="url(#grad-tint)"/>
  <g font-family="Pretendard Variable, -apple-system, sans-serif" fill="${p.ink}">
    <rect x="140" y="220" width="120" height="34" rx="17" fill="none" stroke="${p.accent}" stroke-width="2"/>
    <text x="200" y="243" font-size="18" font-weight="700" fill="${p.accentSoft}" text-anchor="middle">${esc(set.category)}</text>
    <rect x="140" y="320" width="72" height="6" rx="3" fill="${p.accent}"/>
    <text x="140" y="430" font-size="88" font-weight="800" fill="${p.ink}">${esc(t1)}</text>
    ${t2 ? `<text x="140" y="530" font-size="88" font-weight="800" fill="${p.accent}">${esc(t2)}</text>` : ''}
    <text x="140" y="${t2 ? 640 : 540}" font-size="26" font-weight="400" fill="${p.ink}" opacity="0.9">${esc(body.slice(0, 60))}</text>
    <text x="140" y="${t2 ? 680 : 580}" font-size="26" font-weight="400" fill="${p.ink}" opacity="0.9">${esc(body.slice(60, 120))}</text>
    <text x="140" y="1020" font-size="14" font-weight="700" fill="${p.accent}" letter-spacing="2">${esc(set.category).toUpperCase()}</text>
    <text x="${size.w - 140}" y="1020" font-size="14" fill="${p.ink}" opacity="0.7" text-anchor="end" letter-spacing="2">${esc(pageCode)}</text>
  </g>
  <!-- Template: ${tmpl} — title: ${esc(title)} — full body: ${esc(body).slice(0, 200)} -->
</svg>`;
}

function copyIfMissing(src: string, dst: string) {
  if (!existsSync(src)) return false;
  if (existsSync(dst)) {
    if (statSync(dst).size === statSync(src).size) return true;
  }
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(src, dst);
  return true;
}

async function main() {
  const data = JSON.parse(readFileSync(DATA_JSON, 'utf8')) as { sets: CardSet[] };
  const formats: Format[] = ['ig', 'blog', 'a4'];

  let totalHtml = 0;
  let totalSvg = 0;
  let totalAssets = 0;

  for (const set of data.sets) {
    const catDir = `${String(set.categoryIdx).padStart(2, '0')}-${set.category.replace(/\s+/g, '')}`;
    const setDir = join(OUT_ROOT, catDir, set.setName);
    const assetsDir = join(setDir, 'assets');
    mkdirSync(assetsDir, { recursive: true });

    // Per-set README
    const setReadme = `# ${set.title}

**카테고리**: ${set.category} · **세트 번호**: ${set.setIdx} · **슬라이드**: ${set.slides.length}개

## 편집 방법

1. 이 폴더의 \`.html\` 파일을 **브라우저로 직접 열기**(Chrome/Safari 권장) → 실제 레이아웃 확인.
2. 텍스트를 수정하려면 HTML 파일을 VS Code 등 에디터로 열고 \`<h1 class="title">\` \`<p class="body">\` 영역의 텍스트를 변경.
3. 색상·폰트·여백은 파일 상단의 \`<style>\` 블록에서 수정 가능.
4. 배경 이미지는 \`./assets/\` 폴더에 있음. 동일한 이름으로 교체하면 즉시 반영.
5. 최종 PNG로 굽기: 프로젝트 루트에서 \`pnpm tsx scripts/plock/render-cardnews-v3.ts\` 실행.

## Figma/AI/PSD로 변환

- HTML → Figma: [html.to.design](https://www.figma.com/community/plugin/1159123024924461424/HTML.to.Design) 플러그인으로 한번에 import.
- HTML → Illustrator/Photoshop: 브라우저에서 PDF로 인쇄 후 열거나, 같은 경로의 \`../../SVG/${catDir}/${set.setName}/\`에 있는 SVG 파일을 사용.

## 파일 목록

| 파일 | 포맷 | 용도 |
|------|------|------|
${set.slides.flatMap((s) => formats.map((f) => `| \`${String(s.idx).padStart(2, '0')}-${f}.html\` | ${FORMAT_SIZE[f].w}×${FORMAT_SIZE[f].h} | ${f === 'ig' ? 'Instagram' : f === 'blog' ? 'Blog/YouTube' : '인쇄 A4'} |`)).join('\n')}

## 도메인

서비스 URL은 **epub-remastering.hayanmind.com** 을 사용한다.
`;
    writeFileSync(join(setDir, 'README.md'), setReadme);

    // Copy referenced background images into assets/
    const seenBg = new Set<string>();
    for (const slide of set.slides) {
      const bgPath = backgroundFor(set, slide);
      if (bgPath && !seenBg.has(bgPath)) {
        seenBg.add(bgPath);
        const bgName = `${String(slide.idx).padStart(2, '0')}-${bgPath.split('/').pop()}`;
        copyIfMissing(bgPath, join(assetsDir, bgName));
        totalAssets++;
      }
    }

    // HTML per slide per format
    for (const slide of set.slides) {
      const bgPath = backgroundFor(set, slide);
      const bgName = bgPath ? `${String(slide.idx).padStart(2, '0')}-${bgPath.split('/').pop()}` : '';
      for (const format of formats) {
        const html = renderSlideHtml(slide, set, format, set.slides.length, bgName);
        const filePath = join(setDir, `${String(slide.idx).padStart(2, '0')}-${format}.html`);
        writeFileSync(filePath, html);
        totalHtml++;
      }
    }

    // SVG representatives: first + a mid slide (up to 2 per set)
    const svgDir = join(SVG_ROOT, catDir, set.setName);
    mkdirSync(svgDir, { recursive: true });
    const svgIdxs = set.slides.length >= 3
      ? [set.slides[0].idx, set.slides[Math.floor(set.slides.length / 2)].idx]
      : [set.slides[0].idx];
    for (const idx of svgIdxs) {
      const slide = set.slides.find((s) => s.idx === idx)!;
      const bgPath = backgroundFor(set, slide);
      const bgName = bgPath ? `${String(slide.idx).padStart(2, '0')}-${bgPath.split('/').pop()}` : '';
      const svg = renderSlideSvg(slide, set, set.slides.length, bgName);
      writeFileSync(join(svgDir, `${String(slide.idx).padStart(2, '0')}.svg`), svg);
      totalSvg++;
    }

    console.log(`  ✓ ${catDir}/${set.setName} — ${set.slides.length * formats.length} HTML · ${svgIdxs.length} SVG`);
  }

  console.log(`\nTotal: ${totalHtml} HTML files · ${totalSvg} SVG files · ${totalAssets} bg assets copied`);
  console.log(`  → HTML: ${OUT_ROOT}`);
  console.log(`  → SVG:  ${SVG_ROOT}`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
