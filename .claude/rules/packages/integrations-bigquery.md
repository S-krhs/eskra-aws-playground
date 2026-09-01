---
paths:
  - "packages/integrations/bigquery/**"
---

# BigQuery Integration

Google BigQuery への書き込み境界です。公開 API は `src/service-account-credentials.ts` と `src/bigquery-partition-loader.ts` に限定します。

- `@google-cloud/bigquery` を使った load job の実行、連携先テーブルの作成、鍵 JSON の wire 解釈に集中する。
- 鍵の取得元の解決、dataset 名の決定、行の業務的な意味づけ、連携対象日の決定は行わない。認証情報と連携先は呼び出し側が解決して constructor へ渡す。
- 書き込みは `WRITE_TRUNCATE` の load job による日付パーティション（`<table>$YYYYMMDD`）単位の置き換えとし、再実行で結果が変わらない状態を保つ。streaming insert は使わない。
- 鍵の中身はエラーメッセージやログへ出さない。検証失敗は項目名だけを示すエラーへ変換する。
- 行は `AsyncIterable` で受け取り、全件をメモリに載せずに NDJSON として書き込む。
- `ensureTable` はテーブル作成後に metadata を読み直し、パーティションの有効期限が設定されていればエラーにする。期限より古い取得日は load job 成功後に削除され、成功したまま行が消える状態になるため、書き込む前に止める。
