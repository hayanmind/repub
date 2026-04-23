import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const DB_PATH = 'fixtures/dataset-1000/catalog.db';
export const DATASET_DIR = 'fixtures/dataset-1000';

export type Category = 'literature' | 'non-fiction' | 'korean';
export type DownloadStatus = 'pending' | 'success' | 'failed' | 'skipped';

export interface BookRow {
  id: number;
  gutenberg_id: number;
  title: string;
  authors: string;
  languages: string;
  subjects: string;
  bookshelves: string;
  category: Category;
  source: string;
  source_url: string;
  epub_url: string;
  file_path: string | null;
  file_size_bytes: number | null;
  download_count: number | null;
  download_status: DownloadStatus;
  download_error: string | null;
  downloaded_at: string | null;
  created_at: string;
}

export function openDb(path: string = DB_PATH): Database.Database {
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      gutenberg_id    INTEGER UNIQUE NOT NULL,
      title           TEXT NOT NULL,
      authors         TEXT NOT NULL DEFAULT '[]',
      languages       TEXT NOT NULL DEFAULT '[]',
      subjects        TEXT NOT NULL DEFAULT '[]',
      bookshelves     TEXT NOT NULL DEFAULT '[]',
      category        TEXT NOT NULL CHECK (category IN ('literature','non-fiction','korean')),
      source          TEXT NOT NULL DEFAULT 'gutenberg',
      source_url      TEXT NOT NULL,
      epub_url        TEXT NOT NULL,
      file_path       TEXT,
      file_size_bytes INTEGER,
      download_count  INTEGER,
      download_status TEXT NOT NULL DEFAULT 'pending'
                        CHECK (download_status IN ('pending','success','failed','skipped')),
      download_error  TEXT,
      downloaded_at   TEXT,
      created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_books_category  ON books(category);
    CREATE INDEX IF NOT EXISTS idx_books_status    ON books(download_status);
    CREATE INDEX IF NOT EXISTS idx_books_languages ON books(languages);
  `);

  return db;
}
