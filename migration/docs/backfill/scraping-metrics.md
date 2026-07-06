# Scraping Metrics Backfill

旧 Supabase のスクレイピングトランザクションだけを、移行先の
`anime.scraping_metrics` へ直接投入する手順です。

## 対象

- 旧 Supabase source:
  - `public.t_scraping_histories`
  - `public.t_scraping_data`
  - `public.m_jobs`
  - `public.m_attributes`
  - `public.m_websites`
- 移行先:
  - `anime.scraping_metrics`

`translate_title`、`display_*`、`annict_data`、`exclude_works` は対象外です。

## 1. 旧 Supabase で export 用テーブルを作る

旧 Supabase の SQL Editor で次の SQL を実行します。

```sql
CREATE SCHEMA IF NOT EXISTS anime;

DROP TABLE IF EXISTS anime.scraping_metrics;

CREATE TABLE anime.scraping_metrics (
	data_source_id text NOT NULL,
	label text NOT NULL,
	value double precision NOT NULL,
	scraped_date date NOT NULL,
	created_at timestamptz NOT NULL
);

WITH source_map(
	attribute_id,
	data_source_id
) AS (
	VALUES
		(3, '9anime-pv'),
		(2, '9anime-rank'),
		(1, 'amazon-prime-video-jp-movie-rank'),
		(5, 'amazon-prime-video-jp-tv-rank'),
		(17, 'bilibili-rank'),
		(21, 'bilibili-view'),
		(18, 'bilibili-danmaku'),
		(19, 'bilibili-follow'),
		(20, 'bilibili-series-follow'),
		(4, 'danime-rank'),
		(7, 'danime-users'),
		(13, 'danime-favs'),
		(6, 'danime-total-number'),
		(9, 'my-anime-list-members'),
		(10, 'my-anime-list-score'),
		(14, 'netflix-jp-tv-rank'),
		(15, 'netflix-jp-movie-rank')
)
INSERT INTO anime.scraping_metrics (
	data_source_id,
	label,
	value,
	scraped_date,
	created_at
)
SELECT
	source_map.data_source_id,
	btrim(scraping_data.local_title::text),
	scraping_data.value::double precision,
	scraping_histories.date,
	scraping_data.created_at
FROM public.t_scraping_data AS scraping_data
INNER JOIN public.t_scraping_histories AS scraping_histories
	ON scraping_histories.scraping_id = scraping_data.scraping_id
INNER JOIN public.m_jobs AS jobs
	ON jobs.job_id = scraping_histories.job_id
INNER JOIN public.m_attributes AS attributes
	ON attributes.attribute_id = scraping_histories.attribute_id
INNER JOIN public.m_websites AS websites
	ON websites.website_id = jobs.website_id
	AND websites.website_id = attributes.website_id
INNER JOIN source_map
	ON source_map.attribute_id = attributes.attribute_id
WHERE scraping_histories.status = '1'
	AND scraping_data.status = '1'
	AND scraping_data.local_title IS NOT NULL
	AND btrim(scraping_data.local_title::text) <> '';

SELECT
	count(*) AS rows,
	min(scraped_date) AS min_scraped_date,
	max(scraped_date) AS max_scraped_date,
	count(DISTINCT scraped_date) AS scraped_dates
FROM anime.scraping_metrics;

SELECT
	data_source_id,
	count(*) AS rows
FROM anime.scraping_metrics
GROUP BY data_source_id
ORDER BY data_source_id;

SELECT
	data_source_id,
	count(*) AS rows_on_2023_03_20
FROM anime.scraping_metrics
WHERE scraped_date = DATE '2023-03-20'
GROUP BY data_source_id
ORDER BY data_source_id;
```

## 2. dump を作る

PostgreSQL 15 以上の `pg_dump` を使います。
IPv4 only の環境では Supabase の Session pooler 接続文字列を使います。

```bash
pg_dump -Fc \
  --data-only \
  --table=anime.scraping_metrics \
  --no-owner \
  --no-privileges \
  -d "<SUPABASE_DATABASE_URL>" \
  -f scraping_metrics_direct.dump
```

dump の中身が `anime.scraping_metrics` になっていることを確認します。

```bash
pg_restore -l scraping_metrics_direct.dump | grep 'anime.*scraping_metrics'
```

## 3. 移行先へ直接 restore する

移行先の `anime.scraping_metrics` に既にデータが入っている状態で restore すると重複します。
必要なら restore 前に件数を確認します。

```sql
SELECT
	data_source_id,
	count(*) AS rows
FROM anime.scraping_metrics
GROUP BY data_source_id
ORDER BY data_source_id;
```

問題なければ restore します。

```bash
pg_restore \
  --data-only \
  --no-owner \
  --no-privileges \
  -d "<TARGET_DATABASE_URL>" \
  scraping_metrics_direct.dump
```

## 4. restore 後の確認

```sql
SELECT
	count(*) AS rows,
	min(scraped_date) AS min_scraped_date,
	max(scraped_date) AS max_scraped_date,
	count(DISTINCT scraped_date) AS scraped_dates
FROM anime.scraping_metrics;

SELECT
	data_source_id,
	count(*) AS rows
FROM anime.scraping_metrics
GROUP BY data_source_id
ORDER BY data_source_id;
```
