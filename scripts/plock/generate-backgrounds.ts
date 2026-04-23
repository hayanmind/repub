/**
 * Generate background imagery via Gemini nano-banana-pro-preview.
 *
 * Creates a pool of background images (category-themed) + video stills.
 * Output: scripts/plock/assets/bg/{category-slug}/{n}.jpg
 *         scripts/plock/assets/bg/video/{slug}.jpg
 *
 * Usage: npx tsx scripts/plock/generate-backgrounds.ts
 *        RESUME=1 npx tsx ... # only re-generate missing ones
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

// Load .env.local / .env
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
const BG_ROOT = '/Users/jmoh/Workspace/gov-epub-2026/scripts/plock/assets/bg';
const CONCURRENCY = 3;
const RESUME = process.env.RESUME === '1';

type Job = { path: string; prompt: string };

// Universal style suffix ensuring usability as background
const STYLE = [
  'Editorial magazine aesthetic.',
  'Premium minimalist design.',
  'Cinematic mood with atmospheric depth.',
  'Abstract, not literal.',
  'Empty negative space — dark areas suitable for white text overlay.',
  'No text, no letters, no words in the image.',
  'High detail, professional photography or digital illustration quality.',
  'Moody dramatic lighting.',
  '16:9 wide composition.',
].join(' ');

// --- Category prompts ---
interface CatPreset {
  slug: string;
  keyFeel: string;
  subjects: string[]; // 3 variants
}

const CATEGORIES: CatPreset[] = [
  {
    slug: '01-서비스소개',
    keyFeel: 'deep indigo and violet palette, with hints of cream. Modern, trustworthy, bookish but futuristic.',
    subjects: [
      'A single open book transforming into geometric digital shapes, glowing indigo pages floating in a dark void.',
      'Abstract 3D rendering of paper pages dissolving into indigo particles against a deep navy gradient background.',
      'Minimalist composition: a closed vintage book on an indigo marble surface, soft volumetric light from the top-right, paper texture and fine dust particles.',
    ],
  },
  {
    slug: '02-기술차별점',
    keyFeel: 'emerald green, cyan, and deep teal palette. Techy, precise, fast.',
    subjects: [
      'Futuristic dashboard abstract: glowing emerald circuit lines flowing across a dark teal background, data particles, blueprint grid.',
      'Close-up macro of liquid metal flowing like code through channels, emerald and cyan hues, dramatic side lighting.',
      'Topographic vector map in emerald on a black obsidian background, glowing edges, subtle depth-of-field.',
    ],
  },
  {
    slug: '03-활용사례',
    keyFeel: 'warm amber, deep brown, soft gold palette. Human, warm, library-inspired.',
    subjects: [
      'Architectural interior of a grand library at golden hour, warm amber light streaming through tall windows, rows of books dissolving into motion blur at the edges.',
      'Overhead flat-lay of open books, warm amber tea cup, soft fabric, autumn leaves, cinematic golden hour shadows.',
      'Silhouette of a person reading by a window at sunset, warm amber and bronze tones, cinematic depth.',
    ],
  },
  {
    slug: '04-도입가이드',
    keyFeel: 'violet, magenta, and soft purple. Sophisticated, guided, UI-inspired.',
    subjects: [
      'Abstract isometric staircase made of glowing violet and magenta glass panels floating in a dark mist, minimalist composition.',
      'Liquid violet ink swirling into purple water, high-speed photography, dark background, dreamy.',
      'Geometric ribbon flow: violet and magenta paper ribbons weaving through space on a deep charcoal background, soft shadow.',
    ],
  },
  {
    slug: '05-시장트렌드',
    keyFeel: 'rose, crimson, and coral palette with touches of orange. Energetic, urgent, dynamic.',
    subjects: [
      'Abstract upward arrows and soaring lines in crimson and rose on a black textured background, motion streaks.',
      'Explosion of rose-colored flower petals suspended in mid-air against a deep maroon backdrop, high-speed photography.',
      'Dynamic swirling bokeh of red and orange lights on a moody dark background, cinematic blur and grain.',
    ],
  },
];

const VIDEO_STILLS: Job[] = [
  {
    path: join(BG_ROOT, 'video', 'title.jpg'),
    prompt: `Dark cinematic composition: a single open book floating in deep space, indigo and violet nebula background, soft volumetric light, paper pages dissolving into star particles. Wide 16:9. Empty center-bottom area for text overlay. ${STYLE}`,
  },
  {
    path: join(BG_ROOT, 'video', 'landing.jpg'),
    prompt: `Abstract ePub interface concept: translucent panels of digital book pages floating in a dark indigo void, rim lighting, depth of field. Minimalist, high-end editorial. 16:9. ${STYLE}`,
  },
  {
    path: join(BG_ROOT, 'video', 'upload.jpg'),
    prompt: `Conceptual scene: a book transforming into digital particles rising upward through emerald light, dark teal background, cinematic smoke and rim light. 16:9. ${STYLE}`,
  },
  {
    path: join(BG_ROOT, 'video', 'convert.jpg'),
    prompt: `Five glowing emerald gears in a horizontal chain, transforming raw matter into refined crystalline form. Dark teal background, cinematic depth. 16:9. ${STYLE}`,
  },
  {
    path: join(BG_ROOT, 'video', 'preview.jpg'),
    prompt: `Side-by-side mirror composition: one half shows faded old pages, the other half glowing new digital pages. Minimalist editorial. 16:9. Dark moody background. ${STYLE}`,
  },
  {
    path: join(BG_ROOT, 'video', 'report.jpg'),
    prompt: `Abstract data dashboard: glowing emerald KPI bars rising against a dark gradient background, shallow depth of field, cinematic bokeh. 16:9. ${STYLE}`,
  },
  {
    path: join(BG_ROOT, 'video', 'accessibility.jpg'),
    prompt: `Inclusive reading concept: abstract hands of different ages reaching for a floating book, warm golden light on a deep amber background. Soft silhouettes, dreamy. 16:9. ${STYLE}`,
  },
  {
    path: join(BG_ROOT, 'video', 'opensource.jpg'),
    prompt: `Network of glowing violet nodes connected by threads forming a constellation, radiating light from a central open book. Dark deep-purple background. Cinematic. 16:9. ${STYLE}`,
  },
  {
    path: join(BG_ROOT, 'video', 'cta.jpg'),
    prompt: `Stunning hero composition: a single book opening outward, light emanating from within, soft golden glow on an indigo-black background. Invitation, warm, promising. 16:9. ${STYLE}`,
  },
];

function buildJobs(): Job[] {
  const jobs: Job[] = [];
  for (const cat of CATEGORIES) {
    for (let i = 0; i < cat.subjects.length; i++) {
      jobs.push({
        path: join(BG_ROOT, cat.slug, `${i + 1}.jpg`),
        prompt: `${cat.subjects[i]} ${cat.keyFeel} ${STYLE}`,
      });
    }
  }
  jobs.push(...VIDEO_STILLS);
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

  const worker = async (id: number) => {
    while (queue.length) {
      const job = queue.shift();
      if (!job) break;
      const rel = job.path.replace(BG_ROOT + '/', '');
      if (RESUME && existsSync(job.path)) {
        done++;
        console.log(`  [${id}] SKIP ${rel} (exists)`);
        continue;
      }
      process.stdout.write(`  [${id}] → ${rel} ...\n`);
      const result = await generate(job.prompt, job.path);
      done++;
      if (result.ok) {
        ok++;
        bytes += result.bytes;
        const dt = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`  [${id}] ✓ ${rel}  ${(result.bytes / 1024).toFixed(0)}KB  [${done}/${jobs.length} @ ${dt}s]`);
      } else {
        fail++;
        console.log(`  [${id}] ✗ ${rel}  ${result.err}`);
      }
    }
  };

  const workers = Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1));
  await Promise.all(workers);
  console.log(`\n✓ Done in ${((Date.now() - t0) / 1000).toFixed(1)}s — success ${ok} fail ${fail}`);
  console.log(`  Total: ${(bytes / 1024 / 1024).toFixed(1)} MB\n`);
}

async function main() {
  const jobs = buildJobs();
  console.log(`\n→ Generating ${jobs.length} images via ${MODEL} (concurrency=${CONCURRENCY})`);
  console.log(`  Resume mode: ${RESUME ? 'ON (skip existing)' : 'OFF (overwrite)'}\n`);
  await runPool(jobs);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
