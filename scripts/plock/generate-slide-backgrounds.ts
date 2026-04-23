/**
 * Generate a unique AI background image for EACH slide (159 total).
 * Prompt is crafted from slide title + body + category tone.
 *
 * Output: scripts/plock/assets/bg/slides/{catDir}/{setName}/{slideIdx}.jpg
 *
 * Usage:
 *   RESUME=1 npx tsx scripts/plock/generate-slide-backgrounds.ts
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import type { CardSet, Slide } from './parse-cardnews.js';

function loadEnv(path: string) {
  if (!existsSync(path)) return;
  const raw = readFileSync(path, 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"\n]*)"?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnv('/Users/jmoh/Workspace/gov-epub-2026/.env.local');
loadEnv('/Users/jmoh/Workspace/gov-epub-2026/.env');

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('GEMINI_API_KEY missing');
  process.exit(1);
}

const MODEL = 'nano-banana-pro-preview';
const DATA_JSON = '/Users/jmoh/Workspace/gov-epub-2026/scripts/plock/cardnews.json';
const BG_ROOT = '/Users/jmoh/Workspace/gov-epub-2026/scripts/plock/assets/bg/slides';
const CONCURRENCY = 3;
const RESUME = process.env.RESUME === '1';

// Universal style
const STYLE_BASE = [
  'Editorial magazine aesthetic.',
  'Cinematic mood, moody dramatic lighting.',
  'Abstract, not literal interpretation.',
  'Empty negative space suitable for white text overlay.',
  'Absolutely NO text, NO letters, NO words, NO numbers visible in the image.',
  'Very high detail and quality.',
].join(' ');

// Category tone
const CAT_TONE: Record<string, string> = {
  '01-서비스소개':
    'deep indigo violet palette with hints of cream, trustworthy bookish futuristic.',
  '02-기술차별점':
    'emerald green cyan teal palette, techy precise fast.',
  '03-활용사례':
    'warm amber bronze gold palette, human warm library-inspired.',
  '04-도입가이드':
    'violet magenta purple palette, sophisticated UI-inspired.',
  '05-시장트렌드':
    'rose crimson coral palette with orange accents, energetic urgent dynamic.',
};

// Core motif derived from slide semantics
function motifFor(set: CardSet, slide: Slide): string {
  const title = slide.title.toLowerCase();
  const body = (slide.body ?? '').toLowerCase();
  const txt = title + ' ' + body;

  // Heuristic mapping to visual motifs
  if (/ePub|이펍|book|책/i.test(slide.title + ' ' + (slide.body ?? ''))) {
    if (/변환|전환|리마스터|개조/.test(txt))
      return 'A vintage book dissolving into luminous geometric particles, transforming into a glowing digital tablet';
    if (/접근성|alt|장애|포용|모두/.test(txt))
      return 'Abstract hands of different ages reaching toward a floating book emanating gentle light';
    if (/음성|tts|소리|낭독/.test(txt))
      return 'Sound waves rippling outward from an open book page, voice ribbons in the air';
    if (/퀴즈|문제|학습/.test(txt))
      return 'Floating question mark orbs orbiting around an open book, knowledge particles';
    if (/인터랙션|상호작용|누르|클릭/.test(txt))
      return 'A book with pages floating apart, each page becoming an interactive panel glowing at its edges';
  }

  if (/시간|30분|3초|몇 분|빠름|절약/.test(txt))
    return 'A giant hourglass with sand flowing upward, transformed into bright streaming particles';
  if (/인공지능|ai|자동|알고리즘|모델/.test(txt))
    return 'Abstract neural network constellation, glowing nodes connected by threads of light';
  if (/데이터|통계|지표|수치|분석|리포트|kpi/.test(txt))
    return 'Translucent data panels floating in dark space with soft glowing bar charts and connection lines';
  if (/구조|파일|파서|xml|opf/.test(txt))
    return 'Isometric translucent blueprint panels with interlocking geometric shapes, architectural grid';
  if (/트렌드|성장|증가|확대|시장/.test(txt))
    return 'Rising abstract crystalline spires against a dramatic gradient sky, upward motion';
  if (/출판사|편집자|편집/.test(txt))
    return 'Architectural interior of a refined publishing studio, dramatic light beams, stacks of books on tables';
  if (/교육|학교|학생|교재/.test(txt))
    return 'Abstract warm classroom light, books and soft circular lamps, layered knowledge glow';
  if (/도서관|아카이브|소장|장서/.test(txt))
    return 'Grand library cathedral with endless tall bookshelves bathed in warm golden light';
  if (/공공|기관|정부|협력/.test(txt))
    return 'Architectural composition of classical columns glowing under gentle warm light, institutional calm';
  if (/개인|작가|크리에이터/.test(txt))
    return 'A solitary writer silhouette at a desk with a floating ethereal book above, intimate lamp light';

  if (/법규|규정|표준|kwcag|법|제도/.test(txt))
    return 'Abstract crystalline shield with emerald light refractions, legalistic clean geometry';
  if (/오픈소스|github|무상|공개/.test(txt))
    return 'Constellation of glowing nodes forming a network around a central open book';
  if (/구독|플랜|엔터프라이즈|스타터|프로/.test(txt))
    return 'Three glowing crystalline pillars of different heights, tiered and elegant';
  if (/api|연동|sdk|개발자|코드/.test(txt))
    return 'Abstract flowing code ribbons through translucent pipes, deep teal and neon accents';
  if (/대량|배치|일괄|여러 권/.test(txt))
    return 'Long elegant procession of abstract books flowing along a curved path, motion blur';
  if (/첫|시작|3분|바로/.test(txt))
    return 'An open portal of warm light in a dark minimalist interior, inviting composition';

  // Default by template
  if (slide.idx === 1)
    return 'Dramatic hero composition: a single book glowing softly in deep atmospheric space, cinematic wide';
  if (slide.template === 'stat-hero' || slide.stat)
    return 'Abstract enormous geometric shape dominating the frame, dramatic negative space';
  if (slide.template === 'compare')
    return 'Symmetrical mirror composition, one side faded and dim, the other glowing and vivid';
  if (slide.template === 'flow')
    return 'Elegant row of glowing translucent stepping stones receding into atmospheric depth';
  if (slide.template === 'cta')
    return 'Invitation scene: warm golden doorway of light in an atmospheric dark interior';

  return 'Abstract editorial composition with layered translucent panels and soft volumetric light';
}

interface Job {
  catDir: string;
  setName: string;
  slideIdx: number;
  prompt: string;
  outPath: string;
}

function buildJobs(sets: CardSet[]): Job[] {
  const jobs: Job[] = [];
  for (const set of sets) {
    const catDir = `${String(set.categoryIdx).padStart(2, '0')}-${set.category.replace(/\s+/g, '')}`;
    const tone = CAT_TONE[catDir] ?? '';
    for (const slide of set.slides) {
      const motif = motifFor(set, slide);
      const prompt = `${motif}. Color palette: ${tone} 16:9 wide cinematic composition. ${STYLE_BASE}`;
      const outPath = join(BG_ROOT, catDir, set.setName, `${String(slide.idx).padStart(2, '0')}.jpg`);
      jobs.push({ catDir, setName: set.setName, slideIdx: slide.idx, prompt, outPath });
    }
  }
  return jobs;
}

async function generate(prompt: string, outPath: string): Promise<{ ok: boolean; bytes: number; err?: string }> {
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
  });
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (!res.ok) {
      const t = await res.text();
      return { ok: false, bytes: 0, err: `HTTP ${res.status}: ${t.slice(0, 200)}` };
    }
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data: string; mimeType: string } }> } }>;
    };
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    for (const p of parts) {
      const inline = p.inlineData;
      if (inline?.data) {
        const buf = Buffer.from(inline.data, 'base64');
        mkdirSync(dirname(outPath), { recursive: true });
        writeFileSync(outPath, buf);
        return { ok: true, bytes: buf.length };
      }
    }
    return { ok: false, bytes: 0, err: 'no image in response' };
  } catch (err) {
    return { ok: false, bytes: 0, err: err instanceof Error ? err.message : String(err) };
  }
}

async function runPool(jobs: Job[]) {
  const queue = [...jobs];
  let done = 0;
  let ok = 0;
  let fail = 0;
  let bytes = 0;
  const t0 = Date.now();
  const failures: Array<{ path: string; err: string }> = [];

  const worker = async (id: number) => {
    while (queue.length) {
      const job = queue.shift();
      if (!job) break;
      const rel = job.outPath.replace(BG_ROOT + '/', '');
      if (RESUME && existsSync(job.outPath)) {
        done++;
        continue;
      }
      const result = await generate(job.prompt, job.outPath);
      done++;
      if (result.ok) {
        ok++;
        bytes += result.bytes;
        if (done % 5 === 0 || done === jobs.length) {
          const dt = ((Date.now() - t0) / 1000).toFixed(1);
          const rate = done / Number(dt);
          const eta = (jobs.length - done) / Math.max(rate, 0.01);
          process.stdout.write(
            `\r  ${done}/${jobs.length}  ok=${ok} fail=${fail}  ${(bytes / 1024 / 1024).toFixed(1)}MB  ETA ${Math.round(eta)}s     `,
          );
        }
      } else {
        fail++;
        failures.push({ path: rel, err: result.err ?? 'unknown' });
        process.stdout.write(`\n  ✗ ${rel}  ${result.err}\n`);
      }
    }
  };

  const workers = Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1));
  await Promise.all(workers);
  console.log(`\n\n✓ Done in ${((Date.now() - t0) / 1000).toFixed(1)}s — success ${ok} fail ${fail}`);
  console.log(`  Total: ${(bytes / 1024 / 1024).toFixed(1)} MB`);
  if (failures.length) {
    console.log(`\nFailures:`);
    for (const f of failures.slice(0, 10)) console.log(`  ✗ ${f.path}: ${f.err}`);
  }
}

async function main() {
  const data = JSON.parse(readFileSync(DATA_JSON, 'utf8')) as { sets: CardSet[] };
  const jobs = buildJobs(data.sets);
  console.log(`\n→ Generating ${jobs.length} slide-specific images via ${MODEL}`);
  console.log(`  Concurrency: ${CONCURRENCY}  Resume: ${RESUME ? 'ON' : 'OFF'}\n`);
  await runPool(jobs);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
