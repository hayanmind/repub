/**
 * Parse Project Gutenberg's official catalog CSV and populate the SQLite DB
 * with a stratified sample: 500 literature (EN) + 500 non-fiction (EN) + 10 KO.
 *
 * Catalog: https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv
 * ePub URL pattern (noimages, ePub 2.0): https://www.gutenberg.org/cache/epub/{id}/pg{id}.epub
 *
 * Usage:
 *   curl -sS -o tmp/pg_catalog.csv https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv
 *   pnpm tsx scripts/dataset/fetch-metadata.ts
 */
import { readFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { openDb, type Category } from './schema.js';

const CSV_PATH = 'tmp/pg_catalog.csv';
const EPUB_URL = (id: number) => `https://www.gutenberg.org/cache/epub/${id}/pg${id}.epub`;

interface CatalogRow {
  'Text#': string;
  Type: string;
  Issued: string;
  Title: string;
  Language: string;
  Authors: string;
  Subjects: string;
  LoCC: string;
  Bookshelves: string;
}

interface PickedBook {
  id: number;
  title: string;
  authors: string[];
  languages: string[];
  subjects: string[];
  bookshelves: string[];
  category: Category;
}

// Fiction-only markers (must NOT match "non-fiction")
const FICTION_KEYWORDS = [
  'fiction',
  'novel',
  'short stories',
  'tales',
  'poetry',
  'drama',
  'plays',
  'romance',
  'fantasy',
  'science fiction',
  'gothic',
  'adventure stories',
  'mystery',
  'detective',
  'western stories',
];

// Non-fiction markers
const NON_FICTION_KEYWORDS = [
  'history',
  'biography',
  'autobiograph',
  'philosophy',
  'science',
  'mathematics',
  'economics',
  'politics',
  'religion',
  'travel',
  'geography',
  'cooking',
  'cookery',
  'technology',
  'engineering',
  'medicine',
  'law',
  'education',
  'essay',
  'letters',
  'speeches',
  'agriculture',
  'architecture',
  'music',
  'art',
];

function splitList(s: string): string[] {
  return (s || '')
    .split(';')
    .map((x) => x.trim())
    .filter(Boolean);
}

function classify(subjects: string[], bookshelves: string[]): Category | null {
  const hay = [...subjects, ...bookshelves].join(' | ').toLowerCase();
  if (!hay) return null;

  const hasNonFiction = /non-?fiction/.test(hay);
  const hasFiction = FICTION_KEYWORDS.some((kw) => hay.includes(kw)) && !hasNonFiction;
  if (hasFiction) return 'literature';

  const nf = NON_FICTION_KEYWORDS.some((kw) => hay.includes(kw));
  if (nf) return 'non-fiction';

  return null;
}

function shuffle<T>(arr: T[], seed = 42): T[] {
  // Deterministic shuffle via LCG
  let s = seed;
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function main() {
  console.log(`\n→ Reading ${CSV_PATH} ...`);
  const raw = readFileSync(CSV_PATH, 'utf8');
  const rows = parse(raw, { columns: true, skip_empty_lines: true }) as CatalogRow[];
  console.log(`  ${rows.length} total catalog entries`);

  const textRows = rows.filter((r) => r.Type === 'Text' && r['Text#']);
  console.log(`  ${textRows.length} Text entries`);

  // Stratify
  const literature: PickedBook[] = [];
  const nonFiction: PickedBook[] = [];
  const korean: PickedBook[] = [];

  for (const r of textRows) {
    const id = Number.parseInt(r['Text#'], 10);
    if (!Number.isFinite(id)) continue;

    const langs = splitList(r.Language);
    const subjects = splitList(r.Subjects);
    const bookshelves = splitList(r.Bookshelves);

    // Skip books with no metadata for classification
    if (subjects.length === 0 && bookshelves.length === 0) continue;

    const book: PickedBook = {
      id,
      title: r.Title,
      authors: splitList(r.Authors),
      languages: langs,
      subjects,
      bookshelves,
      category: 'literature',
    };

    if (langs.includes('ko')) {
      korean.push({ ...book, category: 'korean' });
      continue;
    }

    if (!langs.includes('en')) continue;

    const cat = classify(subjects, bookshelves);
    if (cat === 'literature') literature.push({ ...book, category: 'literature' });
    else if (cat === 'non-fiction') nonFiction.push({ ...book, category: 'non-fiction' });
  }

  console.log(
    `\n  Pool sizes — literature: ${literature.length}, non-fiction: ${nonFiction.length}, korean: ${korean.length}`,
  );

  // Deterministic shuffle then slice
  const LIT_N = 500;
  const NF_N = 500;
  const KO_N = 10;

  const litPick = shuffle(literature, 42).slice(0, LIT_N);
  const nfPick = shuffle(nonFiction, 7).slice(0, NF_N);
  const koPick = korean.slice(0, KO_N); // Korean is small — no shuffle needed

  console.log(
    `  Sampled     — literature: ${litPick.length}, non-fiction: ${nfPick.length}, korean: ${koPick.length}`,
  );

  // Insert
  const db = openDb();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO books (
      gutenberg_id, title, authors, languages, subjects, bookshelves,
      category, source, source_url, epub_url, download_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'gutenberg', ?, ?, 'pending')
  `);

  const tx = db.transaction((books: PickedBook[]) => {
    let n = 0;
    for (const b of books) {
      const r = insert.run(
        b.id,
        b.title,
        JSON.stringify(b.authors),
        JSON.stringify(b.languages),
        JSON.stringify(b.subjects),
        JSON.stringify(b.bookshelves),
        b.category,
        `https://www.gutenberg.org/ebooks/${b.id}`,
        EPUB_URL(b.id),
      );
      if (r.changes > 0) n++;
    }
    return n;
  });

  const inserted = tx([...litPick, ...nfPick, ...koPick]);
  console.log(`\n✓ Inserted ${inserted} new rows into catalog.db\n`);

  const byCat = db
    .prepare('SELECT category, COUNT(*) AS n FROM books GROUP BY category ORDER BY category')
    .all() as Array<{ category: string; n: number }>;
  console.log('DB totals:');
  for (const r of byCat) console.log(`  ${r.category.padEnd(12)} ${r.n}`);
  const total = db.prepare('SELECT COUNT(*) AS n FROM books').get() as { n: number };
  console.log(`  ${'TOTAL'.padEnd(12)} ${total.n}\n`);

  db.close();
}

main();
