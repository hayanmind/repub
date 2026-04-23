/**
 * Top up the catalog to exactly reach the target non-fiction count by picking
 * replacement books from the CSV pool (skipping ones already in DB).
 */
import { readFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { openDb } from './schema.js';

const CSV_PATH = 'tmp/pg_catalog.csv';
const EPUB_URL = (id: number) => `https://www.gutenberg.org/cache/epub/${id}/pg${id}.epub`;

const NF_KEYWORDS = [
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
  'technology',
  'medicine',
  'law',
  'essay',
  'letters',
  'speeches',
  'architecture',
  'music',
  'art',
];

function splitList(s: string): string[] {
  return (s || '').split(';').map((x) => x.trim()).filter(Boolean);
}

function main() {
  const target = 500;
  const db = openDb();
  const nfOk = db
    .prepare("SELECT COUNT(*) n FROM books WHERE category='non-fiction' AND download_status='success'")
    .get() as { n: number };
  const need = target - nfOk.n;
  console.log(`Non-fiction successful: ${nfOk.n}/${target} → need ${need} replacements\n`);
  if (need <= 0) {
    db.close();
    return;
  }

  const seen = new Set<number>(
    (db.prepare('SELECT gutenberg_id FROM books').all() as Array<{ gutenberg_id: number }>).map(
      (r) => r.gutenberg_id,
    ),
  );

  const raw = readFileSync(CSV_PATH, 'utf8');
  const rows = parse(raw, { columns: true, skip_empty_lines: true }) as Array<{
    'Text#': string;
    Type: string;
    Title: string;
    Language: string;
    Authors: string;
    Subjects: string;
    Bookshelves: string;
  }>;

  const candidates: Array<{
    id: number;
    title: string;
    authors: string[];
    subjects: string[];
    bookshelves: string[];
    languages: string[];
  }> = [];

  for (const r of rows) {
    if (r.Type !== 'Text') continue;
    const id = Number.parseInt(r['Text#'], 10);
    if (!Number.isFinite(id) || seen.has(id)) continue;
    const langs = splitList(r.Language);
    if (!langs.includes('en')) continue;
    const subjects = splitList(r.Subjects);
    const bookshelves = splitList(r.Bookshelves);
    const hay = [...subjects, ...bookshelves].join(' | ').toLowerCase();
    const isFic = /fiction|novel|stories|tales|poetry|drama/.test(hay) && !/non-?fiction/.test(hay);
    if (isFic) continue;
    const isNf = NF_KEYWORDS.some((kw) => hay.includes(kw));
    if (!isNf) continue;
    candidates.push({
      id,
      title: r.Title,
      authors: splitList(r.Authors),
      subjects,
      bookshelves,
      languages: langs,
    });
  }

  // Deterministic pick — use a different seed than the original run.
  let s = 12345;
  const picked = [];
  for (let i = 0; i < need && candidates.length > 0; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const idx = s % candidates.length;
    picked.push(candidates.splice(idx, 1)[0]);
  }

  const insert = db.prepare(`
    INSERT OR IGNORE INTO books (
      gutenberg_id, title, authors, languages, subjects, bookshelves,
      category, source, source_url, epub_url, download_status
    ) VALUES (?, ?, ?, ?, ?, ?, 'non-fiction', 'gutenberg', ?, ?, 'pending')
  `);
  for (const b of picked) {
    insert.run(
      b.id,
      b.title,
      JSON.stringify(b.authors),
      JSON.stringify(b.languages),
      JSON.stringify(b.subjects),
      JSON.stringify(b.bookshelves),
      `https://www.gutenberg.org/ebooks/${b.id}`,
      EPUB_URL(b.id),
    );
  }
  console.log(`✓ Inserted ${picked.length} replacement rows — now run download.ts again.`);
  db.close();
}

main();
