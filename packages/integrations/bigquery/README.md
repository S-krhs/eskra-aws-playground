# BigQuery Integration

Google BigQuery への書き込み境界を担当する integration package です。

## Public API

- `src/service-account-credentials.ts`
  - `parseServiceAccountKey`: GCP サービスアカウント鍵 JSON を認証情報へ検証・変換する。
  - `BigQueryServiceAccountCredentials`: BigQuery クライアントへ渡す認証情報。
- `src/bigquery-partition-loader.ts`
  - `BigQueryPartitionLoader`: 日付パーティション単位でテーブルを置き換えるクライアント。
  - `BigQueryTableTarget` / `BigQueryTableDefinition`: 連携先テーブルの所在と構造。
  - `BigQueryPartitionLoadInput` / `BigQueryPartitionLoadResult`: パーティション置き換えの入出力。

## 責務

- `@google-cloud/bigquery` を使った load job の実行と、連携先テーブルの作成を扱う。
- 鍵 JSON の wire 形式の解釈と、必須項目が欠けている場合のエラー変換を扱う。
- 鍵の取得元の解決（SST secret か env か）、dataset 名の決定、行の業務的な意味づけ、連携対象日の決定は扱わない。

## 冪等性

`replacePartition` は `WRITE_TRUNCATE` の load job で 1 日分のパーティション（`<table>$YYYYMMDD`）をまとめて置き換えます。
同じ入力での再実行は結果を変えず、途中で失敗しても書き込み済みのパーティションはそのまま残ります。

パーティション列の値が指定日と異なる行が混ざっていた場合は、BigQuery 側が load job を失敗させます。

## 前提

- dataset は事前に存在している必要があります（`ensureTable` はテーブルだけを作ります）。
- サービスアカウントには対象 dataset への `roles/bigquery.dataEditor` と、load job 実行のための `roles/bigquery.jobUser` が必要です。
- 連携先テーブルにパーティションの有効期限が設定されていると、`ensureTable` がエラーで止めます。期限より古い取得日は load job が成功したあとに削除され、「書き込みは成功したのに行が無い」状態になるためです。BigQuery サンドボックス（課金未有効）では 60 日未満の有効期限が強制され解除できないため、課金の有効化が必要です。
