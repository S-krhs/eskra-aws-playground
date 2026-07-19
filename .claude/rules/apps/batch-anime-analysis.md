---
paths:
  - "apps/batch-anime-analysis/**"
---

# Batch Anime Analysis

`repositories` のアニメ関連スクレイピング定義を実行し、取得結果を Discord Webhook へ通知する app です。
Orchestrator Lambda が SQS に dataSource 単位の実行要求を投入し、Worker Lambda が SQS message を処理します。バッチ失敗の通知は、CloudWatch alarm を SNS 経由で受ける Notifier Lambda が担います。

## 層と責務

| 層 | 置くもの | 置かないもの |
| --- | --- | --- |
| `src/handlers/orchestrator.ts` | Orchestrator Lambda のエントリポイント、実行要求投入 job への委譲 | SQS message 処理、スクレイピング詳細 |
| `src/handlers/sqs-worker.ts` | SQS event を dataSource スクレイピング job へ委譲する Lambda エントリポイント | SQS message body の解釈、スクレイピング詳細 |
| `src/handlers/alarm-notifier.ts` | CloudWatch alarm の SNS event をアラート通知 job へ委譲する Lambda エントリポイント、通知失敗の握り潰し | 通知文生成、Webhook URL 解決、送信処理の詳細 |
| `src/jobs/` | 実行単位のオーケストレーション、SQS 投入、SQS record の dataSource 単位実行制御、アラート通知の組み立て、repository・feature・integration 呼び出し、レスポンス作成 | feature 単位の値変換、セレクタ解釈、ブラウザ操作詳細、DB 接続や SQL の詳細 |
| `src/jobs/runtime-settings/` | job ごとの実行時設定の型と、SST link からの解決(queue URL、Webhook URL) | 個別 feature の値、event/response/message の型・契約、外部サービスとの通信 |
| `src/features/notifications/` | スクレイピング結果とアラートの Discord 通知文生成、通知表示用の入力型 | HTTP 通信、スクレイピング実行、SNS event 解釈 |
| `src/features/scrape-api/`・`src/features/scrape-webpage/` | JSON から metric への変換(`scrape-api`)、HTML から metric への変換(`scrape-webpage`) | metric の永続化、通知文生成 |
| `src/shared/intermediate-models/` | app 内で受け渡す metric 中間表現(外部公開用ではない) | SQS 送受信、スクレイピング実行、通知文生成 |
| `src/shared/schemas/` | handler ごとの起動イベント検証 schema と応答型(`lambda/<handler>/`)、SQS message body の検証 schema(`sqs/<message>/`) | 実行時設定の解決、repository 定義読み込み |
| `src/shared/routes/` | app 内で参照する batch 名の一元管理(`batch-names.ts`) | job の実装、イベント解釈 |
| `repositories/anime/` | アニメ指標スクレイピング定義、定義読み込み・検証、アニメ分析データの永続化、DB 接続とテーブル行構造の隠蔽 | Lambda イベント解釈、raw data 取得、Webhook URL 解決、通知文生成、Playwright 操作詳細 |

## 依存方向

```text
orchestrator -> jobs -> packages/integrations/sqs
sqs-worker -> jobs
alarm-notifier -> jobs
features -> packages/libs/browser
jobs -> packages/integrations/*
jobs -> repositories/anime -> DB
```

## 実装ルール

- job 名は実行内容が分かるバッチ名(例: `anime-scraping-data-source`)にする。`jobs/` には実行単位のオーケストレーションを置き、機能単位は `features/` に置く。
- 起動イベントは `unknown` として受け取り、job で使う直前に schema で検証・正規化する。repository 由来の入力は repository 境界で検証し、app 内では camelCase の型として扱う。
- 各 Lambda のレスポンスは handler ごとの応答型(例: `OrchestratorResponse`)に合わせ、呼び出し元が機械的に扱える形にする。
- スクレイピング対象の静的定義は `repositories/anime/data.ts` に置き、SQS イベントには定義本体を持たせない。
- metrics の永続化は repository API(`saveScrapingResult`)として呼び出す。保存は metric 取得後・Discord 通知前に行い、失敗した record は batchItemFailure として SQS の再試行に委譲する。
- SQS は Standard Queue を使う。順序は要求せず、message の再試行と DLQ は AWS 側に委譲する。SQS message body の生成・検証は `src/shared/schemas/sqs/data-source/message.ts` に集約し、送信は `@eskra-aws-playground/integration-sqs` に委譲する。
- SQS record ごとの実行制御と partial batch response は dataSource スクレイピング job が扱い、Worker handler は委譲だけを行う。
- アラート通知の通知文生成は `src/features/notifications/alarm-report.ts`、送信の組み立ては `src/jobs/alarm-notification.ts` に置く。通知自体の失敗は SNS 再試行を誘発しないよう、handler でログに留めて握り潰す。
- オーケストレーション手順は、処理セクションごとに 1 行コメントを残す。
- `details` には調査に役立つ安全な情報だけを入れ、設定不足・入力不備・外部 API 失敗はエラーメッセージで区別できるようにする。
- 新しい job を追加したら、app `README.md` の実行できるジョブと環境変数を更新する。
