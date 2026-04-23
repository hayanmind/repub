/**
 * Parse all 20 card news MD files into structured slide JSON.
 *
 * Each MD file describes one set (8–10 slides). Each slide has:
 *  - number + heading title
 *  - `**제목**` block (optional) with a blockquote for the display title
 *  - `**본문**` or `**서브카피**` block with copy
 *  - `**디자인 디렉션**` section with hints (parsed loosely)
 *
 * Output: { sets: [ { category, set, title, meta, slides: [ { idx, title, subtitle, body, template } ] } ] }
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const CARDNEWS_ROOT =
  '/Users/jmoh/Workspace/gov-epub-2026-docs/outsourcing/plock/결과물/산출물/01-카드뉴스';
const OUT_JSON =
  '/Users/jmoh/Workspace/gov-epub-2026/scripts/plock/cardnews.json';

export type Template = 'cover' | 'hook' | 'solution' | 'number' | 'list' | 'compare' | 'cta' | 'body';

export interface Slide {
  idx: number;
  template: Template;
  title: string; // main large heading
  subtitle?: string; // smaller line under title
  body?: string; // longer prose text
  stat?: { number: string; label: string }; // for number template
  bullets?: string[]; // for list template
}

export interface CardSet {
  category: string;
  categoryIdx: number;
  setIdx: number;
  setName: string;
  fileName: string;
  title: string;
  slides: Slide[];
}

// Category map
const CATEGORIES: Record<string, string> = {
  '01-서비스소개': '서비스 소개',
  '02-기술차별점': '기술 차별점',
  '03-활용사례': '활용 사례',
  '04-도입가이드': '도입 가이드',
  '05-시장트렌드': '시장 트렌드',
};

function stripMdMarks(s: string): string {
  return s
    .replace(/^>\s?/gm, '')
    .replace(/\*\*/g, '')
    .replace(/^\s*-\s+/gm, '')
    .trim();
}

function splitBlocks(mdBody: string): string[] {
  // Split on blank lines but keep intra-block lines
  return mdBody
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);
}

function firstMatch(blocks: string[], label: string): string | null {
  for (const b of blocks) {
    const re = new RegExp(`^\\*\\*${label}[^*]*\\*\\*\\s*\\n?`);
    if (re.test(b)) {
      const content = b.replace(re, '').trim();
      if (content) return stripMdMarks(content);
    }
  }
  return null;
}

function extractStat(text: string | null): { number: string; label: string } | null {
  if (!text) return null;
  // Find a striking number like "70%", "5시간", "80%", "1,000권"
  const m = text.match(/([0-9][0-9,\.]*\s*(?:%|시간|분|초|배|권|년|개|회|명|일|GB|MB|kB))/);
  if (m) return { number: m[1], label: text.replace(m[1], '').replace(/[.,]\s*$/, '').trim().slice(0, 60) };
  return null;
}

function extractBullets(text: string | null): string[] | null {
  if (!text) return null;
  const items = text
    .split(/\n/)
    .map((l) => l.replace(/^[-•]\s*/, '').trim())
    .filter((l) => l.length > 1 && l.length < 60);
  if (items.length >= 2 && items.length <= 6) return items;
  return null;
}

function pickTemplate(idx: number, totalSlides: number, title: string, body: string | null): Template {
  const lowerTitle = title.toLowerCase();
  if (idx === 1) return 'cover';
  if (idx === totalSlides) return 'cta';
  if (/인가요|어떠세요|어떤가요|아시나요|\?/.test(title)) return 'hook';
  if (body && /(\d+%|\d+시간|\d+배|\d+초|\d+분)/.test(body)) return 'number';
  if (body && body.split('\n').filter((l) => /^[-•]/.test(l.trim())).length >= 2) return 'list';
  if (/vs|대비|비교|BEFORE|AFTER|전후/i.test(title + (body ?? ''))) return 'compare';
  if (/해결|방법|자동|변환|프로세스/.test(title)) return 'solution';
  return 'body';
}

function parseSetFile(filePath: string, category: string, categoryIdx: number, setIdx: number): CardSet {
  const md = readFileSync(filePath, 'utf8');
  const fileName = basename(filePath, '.md');

  // Extract top-level set title
  const titleMatch = md.match(/^#\s*\[[^\]]+\]\s*(.*)$/m);
  const setTitle = titleMatch ? titleMatch[1].trim() : fileName;

  // Split into slide sections
  const slideBlocks: string[] = md.split(/\n##\s+슬라이드\s*\d+[^\n]*\n/).slice(1);
  const headers = [...md.matchAll(/##\s+슬라이드\s*(\d+)[^\n]*/g)].map((m) => ({ idx: Number(m[1]), heading: m[0].replace(/^##\s+/, '') }));

  const slides: Slide[] = [];
  for (let i = 0; i < slideBlocks.length; i++) {
    const body = slideBlocks[i];
    const headerText = headers[i]?.heading ?? `슬라이드 ${i + 1}`;
    const slideIdx = headers[i]?.idx ?? i + 1;

    // Extract "— xxx" part from header as a fallback title
    const headerTitleMatch = headerText.match(/—\s*(.+)$/);
    const headerTitle = headerTitleMatch ? headerTitleMatch[1].trim() : '';

    const blocks = splitBlocks(body);

    // `**제목**` block (wins over header)
    const rawTitle = firstMatch(blocks, '제목');
    const rawSubtitle = firstMatch(blocks, '서브카피');
    const rawBody = firstMatch(blocks, '본문');

    const title = (rawTitle || headerTitle || '').replace(/\n/g, ' ').trim();
    const subtitle = rawSubtitle ? rawSubtitle.replace(/\n/g, ' ').trim() : undefined;
    const bodyClean = rawBody ?? null;

    const stat = extractStat(bodyClean);
    const bullets = extractBullets(bodyClean);

    const template = pickTemplate(slideIdx, slideBlocks.length, title, bodyClean);

    slides.push({
      idx: slideIdx,
      template,
      title: title || `슬라이드 ${slideIdx}`,
      subtitle,
      body: bodyClean ? bodyClean.replace(/\n/g, ' ').slice(0, 240) : undefined,
      stat: stat ?? undefined,
      bullets: bullets ?? undefined,
    });
  }

  return {
    category,
    categoryIdx,
    setIdx,
    setName: fileName,
    fileName: filePath,
    title: setTitle,
    slides,
  };
}

function main() {
  const sets: CardSet[] = [];
  const categoryDirs = readdirSync(CARDNEWS_ROOT).filter((d) => /^\d{2}-/.test(d)).sort();

  for (const catDir of categoryDirs) {
    const categoryIdx = Number(catDir.slice(0, 2));
    const category = CATEGORIES[catDir] ?? catDir;
    const catPath = join(CARDNEWS_ROOT, catDir);
    const setFiles = readdirSync(catPath)
      .filter((f) => f.startsWith('세트') && f.endsWith('.md'))
      .sort();
    for (const setFile of setFiles) {
      const setIdx = Number(setFile.match(/세트(\d+)/)?.[1] ?? 0);
      const parsed = parseSetFile(join(catPath, setFile), category, categoryIdx, setIdx);
      sets.push(parsed);
    }
  }

  mkdirSync(join(OUT_JSON, '..'), { recursive: true });
  writeFileSync(OUT_JSON, JSON.stringify({ sets }, null, 2));

  const totalSlides = sets.reduce((n, s) => n + s.slides.length, 0);
  console.log(`✓ Parsed ${sets.length} sets · ${totalSlides} slides`);
  console.log(`  → ${OUT_JSON}`);
  const byCat = sets.reduce<Record<string, number>>((acc, s) => {
    acc[s.category] = (acc[s.category] ?? 0) + s.slides.length;
    return acc;
  }, {});
  for (const [c, n] of Object.entries(byCat)) console.log(`    ${c.padEnd(12)} ${n} slides`);
}

main();
