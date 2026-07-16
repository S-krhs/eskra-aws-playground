# Batch Anime Analysis

アニメ関連のランキングや指標をスクレイピングし、結果を Discord Webhook へ通知する app です。

SQS キューイングは Orchestrator Lambda と Worker Lambda に分け、dataSource 単位で再実行できる構成にしています。

## 実行できるジョブ

### `anime-scraping-orchestrator`

`repositories/anime/data.ts` にあるスクレイピング定義のうち、起動時刻に対応する dataSource について、dataSource 単位の実行要求を SQS に投入します。EventBridge Scheduler が毎日 JST 09:00 / 23:00 に起動します。

```json
{
  "job": "anime-scraping-orchestrator",
  "scheduleHour": 9
}
```

- `scheduleHour` に一致する `scheduleHourJst` の dataSource だけを投入します。
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

Webhook URL は SST link（Resource）から、DB 接続文字列は SST が Worker Lambda に設定する `DATABASE_URL` から解決します。app 側の `.env` は使いません。デプロイ時には次の SST Secret が必要です。

- `AnimeAnalysisDiscordWebhook`: Worker がスクレイピング結果を通知する Discord Webhook URL。
- `AlertDiscordWebhook`: Notifier が使うアラート通知用 Discord Webhook URL。
- `DatabaseUrl`: DB（Neon）の pooled 接続文字列。

## ローカル実行

リポジトリルートで `npm run dev` を実行すると、`sst dev` の Live Lambda として動きます。

初回は personal stage に Secret を設定します。

```sh
npx sst secret set AnimeAnalysisDiscordWebhook <url> --config infra/sst.config.ts --stage <stage>
npx sst secret set AlertDiscordWebhook <url> --config infra/sst.config.ts --stage <stage>
npx sst secret set DatabaseUrl <接続文字列> --config infra/sst.config.ts --stage <stage>
```

Worker の動作確認は、personal stage の SQS Queue へ `{"dataSourceId": "..."}` の message を送るか、Orchestrator Lambda を invoke します。

## デプロイ

`infra/sst.config.ts` は次の AWS リソースを作成します。

- Orchestrator Lambda
- Worker Lambda
- Notifier Lambda（CloudWatch alarm を SNS 経由で受け、Discord へ通知する）
- SQS Queue / DLQ
- Orchestrator を毎日 JST 09:00 / 23:00 に起動する EventBridge Scheduler
- Playwright / Chromium 実行用の browser runtime Lambda Layer
- 失敗検知用の SNS Topic と CloudWatch alarm（DLQ 滞留、Orchestrator エラー）

GitHub Actions からのデプロイには次の Secret が必要です。

- `ANIME_ANALYSIS_DISCORD_WEBHOOK_URL`
- `ALERT_DISCORD_WEBHOOK_URL`

## ドキュメント

- アーキテクチャ: [docs/architecture.md](docs/architecture.md)
- 実装ルール: [docs/implementation-rules.md](docs/implementation-rules.md)
