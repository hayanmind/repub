# Dataset — ePub 1,000권 코퍼스

CLAUDE.md §4.3 검증 파이프라인과 §6.3 데이터셋 구축을 위한 ePub 코퍼스.
Project Gutenberg 공식 카탈로그 기반 층화 표본 + Wikisource 한국어 보강.

## 구성

| 카테고리 | 수량 | 소스 | 라이선스 |
|---------|------|------|----------|
| Literature (EN fiction) | 500 | Project Gutenberg | Public Domain |
| Non-fiction (EN, 9개 topic 혼합) | 500 | Project Gutenberg | Public Domain |
| Korean | 10 | Gutenberg(1) + Wikisource(9) | Public Domain |

**비문학 topic 비중**: history 80, science 80, philosophy 70, biography 70, essay 60, travel 50, politics 40, religion 30, cooking 20

## 저장소 구조

```
fixtures/dataset-1000/
├── catalog.db                 # SQLite 메타데이터 DB (gitignored)
├── literature/
│   └── pg{id}.epub            # 500권
├── non-fiction/
│   └── pg{id}.epub            # 500권
└── korean/
    ├── pg{id}.epub            # Gutenberg
    └── ws_{title}.epub        # Wikisource
```

`fixtures/dataset-1000/`는 `.gitignore`에 등록. ~500MB 예상이라 git에 올리지 않음.

## 데이터 수집 경로 (출처 기록)

### 1) Project Gutenberg 메타데이터
- **공식 카탈로그 CSV** (모든 책의 Text#, Title, Language, Authors, Subjects, Bookshelves)
  - `https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv`
  - 로컬 캐시: `tmp/pg_catalog.csv` (~20MB)
- **ePub 파일 URL 패턴** (ePub 2.0 noimages 버전, 파서 스트레스 테스트용)
  - `https://www.gutenberg.org/cache/epub/{id}/pg{id}.epub`

### 2) Wikisource (한국어 보강)
- **ws-export** (Wikisource 문서를 ePub 3.0으로 렌더링)
  - `https://ws-export.wmcloud.org/?lang=ko&format=epub-3&page={title}`
- 수록 작품: 현진건(4), 나도향(2), 이효석(1), 이상(1), 김동인(2)
  - 모두 저자 사후 70년 경과 → 한국 저작권법상 공유(public domain)

## 실행 절차

```bash
# 1) Project Gutenberg 카탈로그 CSV 다운로드 (20MB)
mkdir -p tmp
curl -o tmp/pg_catalog.csv \
  https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv

# 2) 메타데이터 수집 → catalog.db
pnpm tsx scripts/dataset/fetch-metadata.ts

# 3) Project Gutenberg ePub 1,001권 다운로드 (concurrency 4, ~10-20분)
pnpm tsx scripts/dataset/download.ts

# 4) 한국어 10권 보강 (Wikisource, ~10초)
pnpm tsx scripts/dataset/fetch-korean.ts

# 5) 리포트 출력 (용량, 카테고리 분포, KPI 매핑)
pnpm tsx scripts/dataset/report.ts
```

재실행은 안전함 — `catalog.db`는 `INSERT OR IGNORE`이고 `download.ts`는 `pending`/`failed`만 다시 시도.

## DB 스키마

```sql
CREATE TABLE books (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  gutenberg_id    INTEGER UNIQUE NOT NULL,  -- Wikisource는 음수 ID 사용
  title           TEXT NOT NULL,
  authors         TEXT NOT NULL,            -- JSON array
  languages       TEXT NOT NULL,            -- JSON array (["en"], ["ko"])
  subjects        TEXT NOT NULL,            -- JSON array
  bookshelves     TEXT NOT NULL,            -- JSON array
  category        TEXT NOT NULL,            -- 'literature' | 'non-fiction' | 'korean'
  source          TEXT NOT NULL,            -- 'gutenberg' | 'wikisource'
  source_url      TEXT NOT NULL,
  epub_url        TEXT NOT NULL,
  file_path       TEXT,
  file_size_bytes INTEGER,
  download_count  INTEGER,                  -- Gutenberg 인기도
  download_status TEXT NOT NULL,            -- 'pending' | 'success' | 'failed' | 'skipped'
  download_error  TEXT,
  downloaded_at   TEXT,
  created_at      TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_books_category  ON books(category);
CREATE INDEX idx_books_status    ON books(download_status);
CREATE INDEX idx_books_languages ON books(languages);
```

## 쿼리 예시

```bash
# SQLite CLI
sqlite3 fixtures/dataset-1000/catalog.db
sqlite> SELECT category, COUNT(*) FROM books GROUP BY category;
sqlite> SELECT title, authors FROM books WHERE category='literature' LIMIT 5;
sqlite> SELECT title, download_error FROM books WHERE download_status='failed';
```

```ts
// TypeScript
import { openDb } from './scripts/dataset/schema';
const db = openDb();
const literature = db
  .prepare("SELECT * FROM books WHERE category='literature' AND download_status='success'")
  .all();
```

## KPI 매핑 (CLAUDE.md §4.1, §4.3, §6.3)

| KPI | 매핑 |
|-----|------|
| #1 ePubCheck 통과율 — 샘플 100권(문학 50 + 비문학 50 층화 표본) | literature 500 + non-fiction 500에서 100권 추출 |
| 파싱 전수 조사 — 1,000권 | literature + non-fiction = 1,000 |
| 데이터셋 품질 등급화 — 정상/오류/비표준 | Gutenberg는 ePub 2.0 noimages로 **파서 error tolerance 테스트에 최적** |
