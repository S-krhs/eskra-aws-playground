# Batch Anime Analysis

アニメ関連のランキングや指標をスクレイピングし、結果を Discord Webhook へ通知する app です。

SQS キューイングは Orchestrator Lambda と Worker Lambda に分け、dataSource 単位で再実行できる構成にしています。

## 実行できるジョブ

### `anime-scraping-orchestrator`

`repositories/anime/data.ts` にある全スクレイピング定義について、dataSource 単位の実行要求を SQS に投入します。EventBridge Scheduler が毎日 JST 09:00 に起動します。

```json
{
  "job": "anime-scraping-orchestrator"
}
```

- イベントの追加フィールドは読みません。常に repository の全 dataSource を投入します。
- SQS は Standard Queue です。順序は保証せず、再試行と DLQ は SQS に委譲します。

### `anime-scraping-data-source`

SQS message で指定された dataSource のスクレイピング定義を実行し、取得結果を DB(`anime.scraping_metrics`)へ保存してから Discord Webhook へ通知します。Worker Lambda が SQS message ごとに実行します。保存に失敗した record は batchItemFailure として SQS の再試行に委譲します。

SQS message body:

```json
{
  "dataSourceId": "my-anime-list-top-anime-score"
}
```

- 通常は orchestrator が SQS に投入します。
- message body は `dataSourceId` だけを持ちます。
- `dataSourceId` は `repositories/anime/data.ts` の `id` を指定します。
- `source.type` は `api` と `webpage` に対応します。Chromium 起動と HTML 取得は `packages/libs/browser` が扱います。

## アラート通知

バッチ失敗を Discord へ通知する Notifier Lambda です。ジョブルーティングは経由せず、CloudWatch alarm を SNS 経由で受け取って起動します。

- DLQ にメッセージが滞留したとき、または Orchestrator が失敗したときに通知します。
- 通知自体の失敗は SNS 再試行を誘発しないよう、ログに留めて握り潰します。

## 環境変数

`npm run local:batch-anime-analysis` は Worker（dataSource スクレイピング）を実行します。ローカル実行に必要なのは Discord Webhook、DB 接続、対象指定です。

Worker 用 Discord Webhook:

- `ANIME_ANALYSIS_DISCORD_WEBHOOK_URL`
- `DEFAULT_DISCORD_WEBHOOK_URL`

Worker のローカル実行:

- `BATCH_DATA_SOURCE_IDS`（カンマ区切り。未指定なら全 dataSource を対象にする）
- `DATABASE_URL`（ローカル用 Neon branch の pooled 接続文字列。develop 用の値は置かない）

その他 handler のローカル fallback（SST link がない場合に参照）:

- `ANIME_ANALYSIS_QUEUE_URL`: Orchestrator が投入する SQS Queue URL。
- `ALERT_DISCORD_WEBHOOK_URL`: Notifier が使うアラート通知用 Discord Webhook URL。

## ローカル実行

1. `apps/batch-anime-analysis/.env.example` を `apps/batch-anime-analysis/.env` にコピーします。
2. `npm install`
3. `npm run local:batch-anime-analysis`

## デプロイ

`infra/sst.config.ts` は次の AWS リソースを作成します。

- Orchestrator Lambda
- Worker Lambda
- Notifier Lambda（CloudWatch alarm を SNS 経由で受け、Discord へ通知する）
- SQS Queue / DLQ
- Orchestrator を毎日 JST 09:00 に起動する EventBridge Scheduler
- Playwright / Chromium 実行用の browser runtime Lambda Layer
- 失敗検知用の SNS Topic と CloudWatch alarm（DLQ 滞留、Orchestrator エラー）

GitHub Actions からのデプロイには次の Secret が必要です。

- `ANIME_ANALYSIS_DISCORD_WEBHOOK_URL`
- `ALERT_DISCORD_WEBHOOK_URL`

## ドキュメント

- アーキテクチャ: [docs/architecture.md](docs/architecture.md)
- 実装ルール: [docs/implementation-rules.md](docs/implementation-rules.md)
