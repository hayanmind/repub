/**
 * Supplement Korean ePub corpus via Wikisource (ws-export).
 * Project Gutenberg has very few Korean books, so we pull 9 additional
 * public-domain Korean literary works from ko.wikisource.org.
 *
 * ws-export:
 *   https://ws-export.wmcloud.org/?lang=ko&format=epub-3&page={title}
 *
 * Usage: pnpm tsx scripts/dataset/fetch-korean.ts
 */
import { mkdirSync, statSync, writeFileSync, openSync, readSync, closeSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { openDb, DATASET_DIR } from './schema.js';

const WS_EXPORT = (title: string) =>
  `https://ws-export.wmcloud.org/?lang=ko&format=epub-3&page=${encodeURIComponent(title)}`;
const USER_AGENT =
  'gov-epub-2026-research/1.0 (Korean Publishing Industry Promotion Agency; contact: jmoh@hayanmind.com)';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Curated public-domain Korean literary works on ko.wikisource
// (authors deceased >70 years, works already in public domain in Korea).
const WORKS = [
  { title: '운수 좋은 날', author: '현진건', year: 1924 },
  { title: '빈처', author: '현진건', year: 1921 },
  { title: '술 권하는 사회', author: '현진건', year: 1921 },
  { title: 'B사감과 러브 레터', author: '현진건', year: 1925 },
  { title: '메밀꽃 필 무렵', author: '이효석', year: 1936 },
  { title: '벙어리 삼룡이', author: '나도향', year: 1925 },
  { title: '물레방아', author: '나도향', year: 1925 },
  { title: '날개', author: '이상', year: 1936 },
  { title: '배따라기', author: '김동인', year: 1921 },
  { title: '감자', author: '김동인', year: 1925 },
];

// Use high negative IDs so they don't collide with Gutenberg IDs
const BASE_WS_ID = -1000;

async function download(
  url: string,
  path: string,
): Promise<{ ok: true; bytes: number } | { ok: false; err: string }> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/epub+zip,*/*' },
        redirect: 'follow',
      });
      if (res.status === 429 || res.status >= 500) {
        if (attempt < 4) {
          await sleep(5000 * attempt); // 5s, 10s, 15s
          continue;
        }
        return { ok: false, err: `HTTP ${res.status} (rate limited after retries)` };
      }
      if (!res.ok) return { ok: false, err: `HTTP ${res.status}` };
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('epub')) return { ok: false, err: `wrong content-type: ${ct}` };
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1024) return { ok: false, err: `too small (${buf.length}B)` };
      if (buf[0] !== 0x50 || buf[1] !== 0x4b) return { ok: false, err: 'not zip' };
      writeFileSync(path, buf);
      return { ok: true, bytes: buf.length };
    } catch (err) {
      if (attempt === 4) {
        return { ok: false, err: err instanceof Error ? err.message : String(err) };
      }
      await sleep(3000 * attempt);
    }
  }
  return { ok: false, err: 'exhausted retries' };
}

async function main() {
  const db = openDb();
  const koreanDir = join(DATASET_DIR, 'korean');
  mkdirSync(koreanDir, { recursive: true });

  const insert = db.prepare(`
    INSERT OR IGNORE INTO books (
      gutenberg_id, title, authors, languages, subjects, bookshelves,
      category, source, source_url, epub_url,
      file_path, file_size_bytes, download_status, downloaded_at
    ) VALUES (?, ?, ?, '["ko"]', '[]', '[]',
      'korean', 'wikisource', ?, ?, ?, ?, 'success', CURRENT_TIMESTAMP)
  `);
  const insertFailed = db.prepare(`
    INSERT OR IGNORE INTO books (
      gutenberg_id, title, authors, languages, subjects, bookshelves,
      category, source, source_url, epub_url,
      download_status, download_error
    ) VALUES (?, ?, ?, '["ko"]', '[]', '[]',
      'korean', 'wikisource', ?, ?, 'failed', ?)
  `);

  // Skip works already successfully downloaded
  const existing = new Set(
    (
      db
        .prepare(
          "SELECT title FROM books WHERE source='wikisource' AND download_status='success'",
        )
        .all() as Array<{ title: string }>
    ).map((r) => r.title),
  );

  let ok = 0;
  let failed = 0;

  for (let i = 0; i < WORKS.length; i++) {
    const w = WORKS[i];
    if (existing.has(w.title)) {
      console.log(`  [${i + 1}/${WORKS.length}] ${w.title} (${w.author}) ... (already downloaded)`);
      ok++;
      continue;
    }
    const wsId = BASE_WS_ID - i; // unique negative id
    const epubUrl = WS_EXPORT(w.title);
    const sourceUrl = `https://ko.wikisource.org/wiki/${encodeURIComponent(w.title)}`;
    const safeTitle = w.title.replace(/[\s/\\]/g, '_');
    const filePath = join(koreanDir, `ws_${safeTitle}.epub`);

    process.stdout.write(`  [${i + 1}/${WORKS.length}] ${w.title} (${w.author}) ... `);
    const result = await download(epubUrl, filePath);
    if (result.ok) {
      insert.run(
        wsId,
        w.title,
        JSON.stringify([w.author]),
        sourceUrl,
        epubUrl,
        filePath,
        result.bytes,
      );
      ok++;
      console.log(`OK  ${(result.bytes / 1024).toFixed(0)}KB`);
    } else {
      insertFailed.run(wsId, w.title, JSON.stringify([w.author]), sourceUrl, epubUrl, result.err);
      failed++;
      console.log(`FAIL  ${result.err}`);
    }
    await sleep(3000); // Respect ws-export rate limits
  }

  console.log(`\n✓ Korean — success ${ok}, failed ${failed}`);
  db.close();
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
