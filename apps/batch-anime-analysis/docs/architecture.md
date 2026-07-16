# Batch Anime Analysis アーキテクチャ

`apps/batch-anime-analysis` は、`repositories` のアニメ関連スクレイピング定義を実行し、取得結果を Discord Webhook へ通知する app です。
DB 接続、SQL、テーブル行構造、永続化の詳細は app では持たず、repository 境界に閉じ込めます。実行制御は Orchestrator Lambda が SQS に dataSource 単位の実行要求を投入し、Worker Lambda が SQS message を処理する形にします。
バッチ失敗の通知は、CloudWatch alarm を SNS 経由で受ける Notifier Lambda が担います。

## 層と責務

| 層 | 置くもの | 置かないもの |
| --- | --- | --- |
| `src/handlers/orchestrator.ts` | Orchestrator Lambda のエントリポイント、実行要求投入 job への委譲 | SQS message 処理、スクレイピング詳細 |
| `src/handlers/sqs-worker.ts` | SQS event を dataSource スクレイピング job へ委譲する Lambda エントリポイント | SQS message body の解釈、スクレイピング詳細 |
| `src/handlers/alarm-notifier.ts` | CloudWatch alarm の SNS event をアラート通知 job へ委譲する Lambda エントリポイント、通知失敗の握り潰し | 通知文生成、Webhook URL 解決、送信処理の詳細 |
| `src/jobs/` | 実行単位のオーケストレーション、SQS 投入、SQS record の dataSource 単位実行制御、アラート通知の組み立て、repository 呼び出し、feature 呼び出し、integration 呼び出し、レスポンス作成 | feature 単位の値変換、セレクタ解釈、ブラウザ操作詳細、DB 接続や SQL の詳細 |
| `repositories/anime/` | アニメ指標スクレイピング定義、定義読み込み、定義検証、アニメ分析データの永続化、DB 接続とテーブル行構造の隠蔽 | Lambda イベント解釈、取得方式の選択、raw data 取得、Webhook URL 解決、通知文生成、metric 中間表現の正規化詳細、Playwright 操作詳細 |
| `src/shared/intermediate-models/` | app 内で受け渡す metric 中間表現 | SQS 送受信、repository 定義読み込み、スクレイピング実行、通知文生成 |
| `src/shared/schemas/` | handler ごとの起動イベント検証 schema と応答型（`lambda/<handler>/event.ts`・`response.ts`）、SQS message body の検証 schema（`sqs/<message>/message.ts`） | SQS 送受信、実行時設定の解決と型、repository 定義読み込み、スクレイピング実行、通知文生成 |
| `src/features/notifications/` | スクレイピング結果とアラートの Discord 通知文生成、通知表示用の入力型 | HTTP 通信、スクレイピング実行、スクレイピング定義、SNS event 解釈 |
| `src/jobs/runtime-settings/` | job ごとの実行時設定の型と、SST link からの解決 | 個別 feature の値、message body の業務形式、dataSource 単位実行制御、event/response/message の型・契約、外部サービスとの通信 |

## 依存方向

```text
orchestrator -> jobs -> packages/integrations/sqs
sqs-worker -> jobs
alarm-notifier -> jobs
features -> packages/libs/browser
jobs -> packages/integrations/*
jobs -> repositories/anime -> DB
```

- `features/<feature-a>` から `features/<feature-b>` を import しない。
- 外部サービス連携は `packages/integrations/*` の公開 API に委譲する。
- 複数 feature を組み合わせる処理は `jobs/` に置く。
- スクレイピング対象の静的定義は `repositories/anime/data.ts` に置き、イベントには定義本体を持たせない。
- スクレイピング結果 metrics の永続化は `repositories/anime/scraping-metric.repository.ts` に置き、app からは repository API（`saveScrapingResult`）として呼び出す。保存は metric 取得後・Discord 通知前に行い、失敗した record は batchItemFailure として SQS の再試行に委譲する。
- app 側には DB client や接続解決を置かない。DB 接続情報を解決する場合も repository package 側の infra として扱う。
- 外部公開用ではない metric 中間表現の型、正規化は app 内の `src/shared/intermediate-models/metric/metric.ts` に置く。
- JSON から metric への変換は `src/features/scrape-api/`、HTML から metric への変換は `src/features/scrape-webpage/` が扱う。
- Webpage の Playwright-core / Chromium 実行と HTML 取得は `packages/libs/browser` が扱う。
- SQS message body は app 内の `src/shared/schemas/sqs/data-source/message.ts` で生成、検証する。Queue 送信そのものは integration package `@eskra-aws-playground/integration-sqs` が扱う。
- SQS は Standard Queue を使う。順序は要求せず、message の再試行と DLQ は AWS 側に委譲する。
- Worker Lambda handler は SQS event を dataSource スクレイピング job へ渡すだけにする。SQS record ごとの実行制御と partial batch response は dataSource スクレイピング job が扱う。
- バッチ失敗の通知は、CloudWatch alarm を SNS 経由で受ける Notifier Lambda が扱う。通知文生成は `src/features/notifications/alarm-report.ts`、送信の組み立ては `src/jobs/alarm-notification.ts` が担う。
- 通知自体の失敗は SNS 再試行を誘発しないよう、`src/handlers/alarm-notifier.ts` でログに留めて握り潰す。
