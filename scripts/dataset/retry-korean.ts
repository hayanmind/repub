/**
 * One-shot retry for Korean Wikisource downloads with long delays.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openDb, DATASET_DIR } from './schema.js';

const WS_EXPORT = (title: string) =>
  `https://ws-export.wmcloud.org/?lang=ko&format=epub-3&page=${encodeURIComponent(title)}`;
const USER_AGENT =
  'gov-epub-2026-research/1.0 (Korean Publishing Industry Promotion Agency; contact: jmoh@hayanmind.com)';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Try additional public-domain works as fallback candidates.
// All authors deceased >70 years.
const CANDIDATES = [
  { title: '탈출기', author: '최서해', wsId: -2011 },
  { title: '홍염', author: '최서해', wsId: -2012 },
  { title: '고향', author: '현진건', wsId: -2013 },
  { title: '불놀이', author: '주요한', wsId: -2014 },
  { title: '날개', author: '이상', wsId: -2003 },
  { title: 'B사감과 러브레터', author: '현진건', wsId: -2001 },
];

async function main() {
  const db = openDb();
  const koreanDir = join(DATASET_DIR, 'korean');
  mkdirSync(koreanDir, { recursive: true });

  const current = db
    .prepare("SELECT COUNT(*) n FROM books WHERE category='korean' AND download_status='success'")
    .get() as { n: number };
  const needed = 10 - current.n;
  console.log(`Currently ${current.n} Korean books; need ${needed} more.\n`);
  if (needed <= 0) {
    db.close();
    return;
  }

  const existing = new Set(
    (
      db
        .prepare("SELECT title FROM books WHERE category='korean'").all() as Array<{ title: string }>
    ).map((r) => r.title),
  );

  const insert = db.prepare(`
    INSERT OR IGNORE INTO books (
      gutenberg_id, title, authors, languages, subjects, bookshelves,
      category, source, source_url, epub_url,
      file_path, file_size_bytes, download_status, downloaded_at
    ) VALUES (?, ?, ?, '["ko"]', '[]', '[]',
      'korean', 'wikisource', ?, ?, ?, ?, 'success', CURRENT_TIMESTAMP)
  `);

  let gotten = 0;
  for (let i = 0; i < CANDIDATES.length && gotten < needed; i++) {
    const w = CANDIDATES[i];
    if (existing.has(w.title)) {
      console.log(`  [skip] ${w.title} — already in DB`);
      continue;
    }
    const epubUrl = WS_EXPORT(w.title);
    const sourceUrl = `https://ko.wikisource.org/wiki/${encodeURIComponent(w.title)}`;
    const safeTitle = w.title.replace(/[\s/\\]/g, '_');
    const filePath = join(koreanDir, `ws_${safeTitle}.epub`);

    if (i > 0) {
      process.stdout.write(`  (wait 20s) ...\n`);
      await sleep(20000);
    }

    process.stdout.write(`  [${gotten + 1}/${needed}] ${w.title} (${w.author}) ... `);
    try {
      const res = await fetch(epubUrl, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/epub+zip,*/*' },
        redirect: 'follow',
      });
      if (!res.ok) {
        console.log(`FAIL  HTTP ${res.status}`);
        continue;
      }
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('epub')) {
        console.log(`FAIL  ${ct || 'no content-type'}`);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1024 || buf[0] !== 0x50 || buf[1] !== 0x4b) {
        console.log(`FAIL  not zip (${buf.length}B)`);
        continue;
      }
      writeFileSync(filePath, buf);
      insert.run(
        w.wsId,
        w.title,
        JSON.stringify([w.author]),
        sourceUrl,
        epubUrl,
        filePath,
        buf.length,
      );
      gotten++;
      console.log(`OK  ${(buf.length / 1024).toFixed(0)}KB`);
    } catch (err) {
      console.log(`FAIL  ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const final = db
    .prepare("SELECT COUNT(*) n FROM books WHERE category='korean' AND download_status='success'")
    .get() as { n: number };
  console.log(`\n✓ Korean corpus: ${final.n}/10 books`);
  db.close();
}

main();
