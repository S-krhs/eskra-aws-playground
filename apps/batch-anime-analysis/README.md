# Batch Anime Analysis

## 実行できるジョブ

### `anime-scraping-orchestrator`

EventBridge Scheduler が毎日 JST 09:00 / 23:00 に起動します。

```json
{
  "job": "anime-scraping-orchestrator",
  "scheduleHour": 9
}
```

- `scheduleHour` に一致する `scheduleHourJst` の dataSource だけを SQS へ投入します。

### `anime-scraping-data-source`

Worker Lambda が SQS message ごとに実行します。通常は orchestrator が投入するため手動で invoke する対象ではありません。

SQS message body:

```json
{
  "dataSourceId": "my-anime-list-top-anime-score"
}
```

- `dataSourceId` は `repositories/anime/data.ts` の `id` を指定します。

### `anime-metric-bigquery-export`

EventBridge Scheduler が毎日 JST 01:00 に起動し、前日分を連携します。

```json
{
  "job": "anime-metric-bigquery-export",
  "startDate": "2026-08-01",
  "endDate": "2026-08-31"
}
```

- `startDate` / `endDate` は両端を含む取得日の範囲です。両方省略すると JST の前日 1 日分、片方だけの指定はその 1 日分になります。
- dataset は事前に BigQuery 側で作成しておく必要があります（テーブルは Lambda が作成します）。
- 範囲が広く Lambda の実行時間（15 分）を超えた場合は、ログの最後の取得日から範囲を分けて再実行します。

過去分の連携は GitHub Actions の **Backfill anime metrics to BigQuery** workflow（`workflow_dispatch`）で、開始日と終了日を入れて実行します。

- `dryRun` を有効にすると invoke せず分割区間だけを表示します。
- 途中で失敗しても済んだ区間は残るため、ログとサマリに出る失敗区間の開始日から再実行します。
- 全期間を一度に流すと数時間かかるため、年単位などに分けて実行します。
- BigQuery の load job は 1 テーブルあたり 1 日 1,500 件までです。同じ日に全期間を何度も流し直すと上限に当たります。

## 環境変数

デプロイ時に必要な SST Secret:

- `AnimeAnalysisDiscordWebhook`
- `AlertDiscordWebhook`
- `DatabaseUrl`
- `GcpServiceAccountKey`（JSON そのまま）

GitHub Actions secret:

- `ANIME_ANALYSIS_DISCORD_WEBHOOK_URL`
- `ALERT_DISCORD_WEBHOOK_URL`
- `GCP_SERVICE_ACCOUNT_KEY`

## ローカル実行

```bash
npm run dev
```

初回は personal stage に secret を設定します。

```bash
npx sst secret set AnimeAnalysisDiscordWebhook <url> --config infra/sst.config.ts --stage <stage>
npx sst secret set AlertDiscordWebhook <url> --config infra/sst.config.ts --stage <stage>
npx sst secret set DatabaseUrl <接続文字列> --config infra/sst.config.ts --stage <stage>
npx sst secret set GcpServiceAccountKey "$(cat <鍵ファイル>.json)" --config infra/sst.config.ts --stage <stage>
```

Worker の動作確認は、personal stage の SQS Queue へ `{"dataSourceId": "..."}` の message を送るか、Orchestrator Lambda を invoke します。

## BigQuery の手動セットアップ

1. GCP project を作り、BigQuery API を有効にする。
2. **課金を有効にする。** サンドボックス（課金未有効）は dataset に 60 日未満のパーティション有効期限が強制され解除できず、それより古い取得日は書き込んでも削除される。
3. dataset を作る（develop は `anime_analysis`、personal stage は `anime_analysis_<stage>`。dataset ID は英数字とアンダースコアのみ）。ロケーションは作成時に決める（後から変更不可）。
4. サービスアカウントを作り、対象 dataset に `roles/bigquery.dataEditor`、project に `roles/bigquery.jobUser` を付与する。
5. JSON 鍵を発行し、GitHub Secret `GCP_SERVICE_ACCOUNT_KEY` に登録する。
6. dataset とテーブルにパーティションの有効期限を設定しない（設定されていると連携 Lambda が起動時にエラーで止まる）。
