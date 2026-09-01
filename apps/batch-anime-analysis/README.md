# Batch Anime Analysis

アニメ関連のランキングや指標をスクレイピングし、結果を Discord Webhook へ通知する app です。
蓄積した指標は、分析用に BigQuery へ日次で連携します。

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

### `anime-metric-bigquery-export`

`anime.scraping_metrics` に蓄積した指標を BigQuery へ連携します。EventBridge Scheduler が毎日 JST 01:00 に起動し、前日分を連携します。

```json
{
  "job": "anime-metric-bigquery-export",
  "startDate": "2026-08-01",
  "endDate": "2026-08-31"
}
```

- `startDate` / `endDate` は両端を含む取得日（`scraped_date`）の範囲です。両方省略すると JST の前日 1 日分になります。片方だけの指定はその 1 日分です。
- 取得日ごとに BigQuery の DAY パーティション（`<table>$YYYYMMDD`）を `WRITE_TRUNCATE` の load job で置き換えます。同じ範囲で何度実行しても結果は変わりません。
- 範囲内で指標が 1 件も無い取得日はスキップします。
- 連携先テーブル（`scraping_metrics`）が無ければ、パーティションとクラスタリングを設定して作成します。dataset は事前に BigQuery 側で作成しておく必要があります。
- 取得日ごとに完了ログを出します。範囲が広く Lambda の実行時間（15 分）に収まらない場合は、ログの最後の取得日から範囲を分けて再実行します。

過去分の連携は GitHub Actions の **Backfill anime metrics to BigQuery** workflow から実行します（`workflow_dispatch`）。開始日と終了日を入れると `scripts/backfill-anime-bigquery.js` が暦月ごとに区切って Lambda を順に invoke し、区間ごとの取得日数と行数を Job Summary に出します。

- `dryRun` を有効にすると、invoke せず分割される区間だけを表示します。
- 途中で失敗しても、済んだ区間は BigQuery 側に残ります。ログとサマリに出る失敗した区間の開始日から再実行してください。
- Lambda 名は `infra/sst.config.ts` の `AnimeMetricBigQueryExportFunction` の `name` と workflow の `FUNCTION_NAME` で揃えます。ずれた場合はスクリプトが最初の `get-function` で止まります。
- 全期間（2023-03 以降）を一度に流すと数時間かかります。年単位などに分けて複数回実行するほうが、途中経過を確認しやすくなります。
- BigQuery の load job は 1 テーブルあたり 1 日 1,500 件までです。1 取得日につき 1 件使うため、同じ日に全期間を何度も流し直すと上限に当たります。

## アラート通知

バッチ失敗を Discord へ通知する Notifier Lambda です。ジョブルーティングは経由せず、CloudWatch alarm を SNS 経由で受け取って起動します。

- DLQ にメッセージが滞留したとき、Orchestrator が失敗したとき、または BigQuery 連携が失敗したときに通知します。
- 通知自体の失敗は SNS 再試行を誘発しないよう、ログに留めて握り潰します。

## 環境変数

Webhook URL と GCP のサービスアカウント鍵は SST link（Resource）から、DB 接続文字列と BigQuery の dataset 名は SST が Lambda に設定する環境変数から解決します。app 側の `.env` は使いません。デプロイ時には次の SST Secret が必要です。

- `AnimeAnalysisDiscordWebhook`: Worker がスクレイピング結果を通知する Discord Webhook URL。
- `AlertDiscordWebhook`: Notifier が使うアラート通知用 Discord Webhook URL。
- `DatabaseUrl`: DB（Neon）の pooled 接続文字列。
- `GcpServiceAccountKey`: BigQuery へ書き込む GCP サービスアカウント鍵（JSON そのまま）。

Lambda に設定される環境変数:

- `DATABASE_URL`: Worker と BigQuery 連携 Lambda が使う DB 接続文字列。
- `BIGQUERY_DATASET`: 連携先の BigQuery dataset 名。stage ごとに切り替わります。

## ローカル実行

リポジトリルートで `npm run dev` を実行すると、`sst dev` の Live Lambda として動きます。

初回は personal stage に Secret を設定します。

```sh
npx sst secret set AnimeAnalysisDiscordWebhook <url> --config infra/sst.config.ts --stage <stage>
npx sst secret set AlertDiscordWebhook <url> --config infra/sst.config.ts --stage <stage>
npx sst secret set DatabaseUrl <接続文字列> --config infra/sst.config.ts --stage <stage>
npx sst secret set GcpServiceAccountKey "$(cat <鍵ファイル>.json)" --config infra/sst.config.ts --stage <stage>
```

Worker の動作確認は、personal stage の SQS Queue へ `{"dataSourceId": "..."}` の message を送るか、Orchestrator Lambda を invoke します。

## デプロイ

`infra/sst.config.ts` は次の AWS リソースを作成します。

- Orchestrator Lambda
- Worker Lambda
- BigQuery 連携 Lambda
- Notifier Lambda（CloudWatch alarm を SNS 経由で受け、Discord へ通知する）
- SQS Queue / DLQ
- Orchestrator を毎日 JST 09:00 / 23:00 に起動する EventBridge Scheduler
- BigQuery 連携を毎日 JST 01:00 に起動する EventBridge Scheduler
- Playwright / Chromium 実行用の browser runtime Lambda Layer
- 失敗検知用の SNS Topic と CloudWatch alarm（DLQ 滞留、Orchestrator エラー、BigQuery 連携エラー）

GitHub Actions からのデプロイには次の Secret が必要です。

- `ANIME_ANALYSIS_DISCORD_WEBHOOK_URL`
- `ALERT_DISCORD_WEBHOOK_URL`
- `GCP_SERVICE_ACCOUNT_KEY`

## BigQuery の手動セットアップ（記録）

GCP 側は SST の管理外のため、初回のみ手作業で用意し内容をここに記録します。

- GCP project を作り、BigQuery API を有効にする。
- dataset を作る（develop は `anime_analysis`、personal stage は `anime_analysis_<stage>`。dataset ID は英数字とアンダースコアのみのため、stage 名の記号は `_` に置き換わる）。ロケーションは変更できないため作成時に決める。
- サービスアカウントを作り、対象 dataset に `roles/bigquery.dataEditor`、project に `roles/bigquery.jobUser` を付与する。
- JSON 鍵を発行し、GitHub Secret `GCP_SERVICE_ACCOUNT_KEY` に JSON そのままを登録する。
- テーブル（`scraping_metrics`）は連携 Lambda が作るため、console では作らない。
