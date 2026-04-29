/**
 * Download ePub files listed in catalog.db into fixtures/dataset-1000/.
 * Resumable: skips rows already marked `success`.
 *
 * Project Gutenberg robot access policy — be respectful:
 *   - User-Agent identifies us
 *   - 4 concurrent downloads max
 *   - Back off on 4xx/5xx
 *
 * Usage: pnpm tsx scripts/dataset/download.ts
 */
import { mkdirSync, createWriteStream, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { openDb, DATASET_DIR, type BookRow } from './schema.js';

const CONCURRENCY = 4;
const USER_AGENT =
  'repub-research/1.0 (Korean Publishing Industry Promotion Agency; contact: jmoh@hayanmind.com)';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Row = Pick<
  BookRow,
  'id' | 'gutenberg_id' | 'category' | 'epub_url' | 'download_status'
>;

async function downloadOne(
  row: Row,
): Promise<{ ok: true; path: string; bytes: number } | { ok: false; err: string }> {
  const categoryDir = join(DATASET_DIR, row.category);
  mkdirSync(categoryDir, { recursive: true });
  const filePath = join(categoryDir, `pg${row.gutenberg_id}.epub`);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(row.epub_url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/epub+zip,*/*' },
        redirect: 'follow',
      });

      if (res.status === 404) return { ok: false, err: `HTTP 404 (not available)` };
      if (res.status === 429 || res.status >= 500) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
      if (!res.ok) return { ok: false, err: `HTTP ${res.status}` };
      if (!res.body) return { ok: false, err: 'empty body' };

      // Stream to disk
      await new Promise<void>((resolve, reject) => {
        const out = createWriteStream(filePath);
        const readable = Readable.fromWeb(res.body as never);
        readable.pipe(out);
        out.on('finish', () => resolve());
        out.on('error', reject);
        readable.on('error', reject);
      });

      const bytes = statSync(filePath).size;
      if (bytes < 512) {
        unlinkSync(filePath);
        return { ok: false, err: `file too small (${bytes}B)` };
      }
      // Quick ZIP magic-byte check (ePub is a ZIP)
      const { openSync, readSync, closeSync } = await import('node:fs');
      const fd = openSync(filePath, 'r');
      const buf = Buffer.alloc(4);
      readSync(fd, buf, 0, 4, 0);
      closeSync(fd);
      if (buf[0] !== 0x50 || buf[1] !== 0x4b) {
        unlinkSync(filePath);
        return { ok: false, err: 'not a zip file' };
      }

      return { ok: true, path: filePath, bytes };
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        return { ok: false, err: err instanceof Error ? err.message : String(err) };
      }
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }
  return { ok: false, err: 'exhausted retries' };
}

async function main() {
  const db = openDb();
  const rows = db
    .prepare(
      `SELECT id, gutenberg_id, category, epub_url, download_status
       FROM books
       WHERE download_status IN ('pending','failed')
       ORDER BY id`,
    )
    .all() as Row[];

  console.log(`\n→ ${rows.length} books to download (concurrency=${CONCURRENCY})\n`);

  const updateSuccess = db.prepare(`
    UPDATE books
       SET download_status = 'success',
           file_path       = ?,
           file_size_bytes = ?,
           downloaded_at   = CURRENT_TIMESTAMP,
           download_error  = NULL
     WHERE id = ?
  `);
  const updateFailed = db.prepare(`
    UPDATE books
       SET download_status = 'failed',
           download_error  = ?,
           downloaded_at   = CURRENT_TIMESTAMP
     WHERE id = ?
  `);

  const total = rows.length;
  let done = 0;
  let ok = 0;
  let failed = 0;
  let bytes = 0;
  const t0 = Date.now();

  // Worker pool
  const queue = [...rows];
  const workers: Promise<void>[] = [];

  const worker = async () => {
    while (queue.length) {
      const row = queue.shift();
      if (!row) break;
      const result = await downloadOne(row);
      done++;
      if (result.ok) {
        ok++;
        bytes += result.bytes;
        updateSuccess.run(result.path, result.bytes, row.id);
      } else {
        failed++;
        updateFailed.run(result.err, row.id);
      }
      if (done % 10 === 0 || done === total) {
        const elapsed = (Date.now() - t0) / 1000;
        const rate = done / elapsed;
        const eta = (total - done) / Math.max(rate, 0.01);
        process.stdout.write(
          `\r  ${done}/${total}  ok=${ok}  fail=${failed}  ${(bytes / 1024 / 1024).toFixed(1)}MB  ${rate.toFixed(1)}/s  ETA ${Math.round(eta)}s      `,
        );
      }
    }
  };

  for (let i = 0; i < CONCURRENCY; i++) workers.push(worker());
  await Promise.all(workers);

  const elapsed = (Date.now() - t0) / 1000;
  console.log(
    `\n\n✓ Done in ${elapsed.toFixed(1)}s — success ${ok}, failed ${failed}, total ${(bytes / 1024 / 1024).toFixed(1)} MB\n`,
  );
  db.close();
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
