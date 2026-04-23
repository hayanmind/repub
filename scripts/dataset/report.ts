/**
 * Print capacity + distribution report for the dataset.
 *
 * Usage: pnpm tsx scripts/dataset/report.ts
 */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { openDb, DATASET_DIR } from './schema.js';

function formatBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

function walk(dir: string): { files: number; bytes: number } {
  let files = 0;
  let bytes = 0;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) {
        const sub = walk(p);
        files += sub.files;
        bytes += sub.bytes;
      } else {
        if (entry.name.endsWith('.epub')) {
          files++;
          bytes += statSync(p).size;
        }
      }
    }
  } catch {
    // empty
  }
  return { files, bytes };
}

function main() {
  const db = openDb();

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  ePub 1,000권 데이터셋 리포트');
  console.log('══════════════════════════════════════════════════════════\n');

  // 1) DB status breakdown
  const statusRows = db
    .prepare(
      `SELECT category, download_status, COUNT(*) AS n, SUM(file_size_bytes) AS bytes
         FROM books
        GROUP BY category, download_status
        ORDER BY category, download_status`,
    )
    .all() as Array<{ category: string; download_status: string; n: number; bytes: number | null }>;

  console.log('▶ DB 상태별 분포');
  console.log('  ' + 'category'.padEnd(14) + 'status'.padEnd(12) + 'count'.padStart(8) + '  size');
  console.log('  ' + '─'.repeat(56));
  for (const r of statusRows) {
    console.log(
      '  ' +
        r.category.padEnd(14) +
        r.download_status.padEnd(12) +
        String(r.n).padStart(8) +
        '  ' +
        (r.bytes ? formatBytes(r.bytes) : '—'),
    );
  }

  // 2) Totals
  console.log('\n▶ 요약');
  const total = db.prepare('SELECT COUNT(*) n FROM books').get() as { n: number };
  const ok = db
    .prepare("SELECT COUNT(*) n, SUM(file_size_bytes) bytes FROM books WHERE download_status='success'")
    .get() as { n: number; bytes: number | null };
  const failed = db
    .prepare("SELECT COUNT(*) n FROM books WHERE download_status='failed'")
    .get() as { n: number };

  console.log(`  총 레코드:       ${total.n}`);
  console.log(`  다운로드 성공:   ${ok.n} (${total.n ? ((ok.n / total.n) * 100).toFixed(1) : 0}%)`);
  console.log(`  다운로드 실패:   ${failed.n}`);
  console.log(`  총 용량 (DB):    ${ok.bytes ? formatBytes(ok.bytes) : '—'}`);

  // 3) Disk scan
  console.log('\n▶ 디스크 실측 (fixtures/dataset-1000/)');
  for (const cat of ['literature', 'non-fiction', 'korean']) {
    const { files, bytes } = walk(join(DATASET_DIR, cat));
    console.log(`  ${cat.padEnd(14)} ${String(files).padStart(4)} files  ${formatBytes(bytes)}`);
  }
  const all = walk(DATASET_DIR);
  console.log('  ─'.repeat(28));
  console.log(`  ${'TOTAL'.padEnd(14)} ${String(all.files).padStart(4)} files  ${formatBytes(all.bytes)}`);

  // 4) Sources
  console.log('\n▶ 데이터 출처');
  const sourceRows = db
    .prepare(
      `SELECT source, COUNT(*) AS n
         FROM books
         WHERE download_status = 'success'
         GROUP BY source
         ORDER BY n DESC`,
    )
    .all() as Array<{ source: string; n: number }>;
  for (const r of sourceRows) console.log(`  ${r.source.padEnd(14)} ${r.n}`);
  console.log(
    '\n  — gutenberg: https://www.gutenberg.org/cache/epub/{id}/pg{id}.epub (ePub 2.0 noimages)',
  );
  console.log(
    '  — wikisource: https://ws-export.wmcloud.org/?lang=ko&format=epub-3&page={title}',
  );

  // 5) KPI check against §4.1
  console.log('\n▶ KPI 매핑 (CLAUDE.md §4.1)');
  const litOk = db
    .prepare("SELECT COUNT(*) n FROM books WHERE category='literature' AND download_status='success'")
    .get() as { n: number };
  const nfOk = db
    .prepare("SELECT COUNT(*) n FROM books WHERE category='non-fiction' AND download_status='success'")
    .get() as { n: number };
  const koOk = db
    .prepare("SELECT COUNT(*) n FROM books WHERE category='korean' AND download_status='success'")
    .get() as { n: number };
  const check = (name: string, actual: number, need: number) => {
    const status = actual >= need ? '✓' : '✗';
    console.log(`  ${status} ${name.padEnd(30)} ${actual} / ${need}`);
  };
  check('문학 ≥ 50 (층화 표본)', litOk.n, 50);
  check('비문학 ≥ 50 (층화 표본)', nfOk.n, 50);
  check('한국어 샘플', koOk.n, 1);
  check('전체 ≥ 1,000 (파싱 전수)', litOk.n + nfOk.n, 1000);

  // 6) Failure samples
  if (failed.n > 0) {
    console.log('\n▶ 실패 샘플 (최대 5건)');
    const fails = db
      .prepare(
        "SELECT gutenberg_id, title, download_error FROM books WHERE download_status='failed' LIMIT 5",
      )
      .all() as Array<{ gutenberg_id: number; title: string; download_error: string }>;
    for (const f of fails) {
      console.log(`  pg${f.gutenberg_id}  "${f.title.slice(0, 40)}"  → ${f.download_error}`);
    }
  }

  console.log('\n▶ 쿼리 예시');
  console.log('  # SQLite CLI로 직접 조회');
  console.log('  sqlite3 fixtures/dataset-1000/catalog.db "SELECT title, authors FROM books LIMIT 5;"');
  console.log('  # Node/TypeScript에서 사용');
  console.log("  import { openDb } from './scripts/dataset/schema';");
  console.log("  const db = openDb();");
  console.log("  db.prepare('SELECT * FROM books WHERE category=?').all('literature');");
  console.log('\n══════════════════════════════════════════════════════════\n');

  db.close();
}

main();
