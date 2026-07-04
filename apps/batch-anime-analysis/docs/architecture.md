# Batch Anime Analysis アーキテクチャ

`apps/batch-anime-analysis` は、`repositories` のアニメ関連スクレイピング定義を実行し、取得結果を Discord Webhook へ通知する app です。
現段階では Supabase 接続と DB 登録を持ちません。実行制御は Orchestrator Lambda が SQS に dataSource 単位の実行要求を投入し、Worker Lambda が SQS message を処理する形にします。

## 層と責務

| 層 | 置くもの | 置かないもの |
| --- | --- | --- |
| `src/handlers/orchestrator.ts` | Orchestrator Lambda のエントリポイント、実行要求投入 job への委譲 | SQS message 処理、スクレイピング詳細 |
| `src/handlers/sqs-worker.ts` | SQS event を dataSource スクレイピング job へ委譲する Lambda エントリポイント | SQS message body の解釈、スクレイピング詳細 |
| `src/jobs/` | 実行単位のオーケストレーション、SQS record の dataSource 単位実行制御、repository の定義取得、feature 呼び出し、integration 呼び出し、共通レスポンス作成 | feature 単位の値変換、セレクタ解釈、ブラウザ操作詳細 |
| `repositories/anime/` | アニメ指標スクレイピング定義、定義読み込み、定義検証 | Lambda イベント解釈、取得方式の選択、raw data 取得、Webhook URL 解決、DB 登録、通知文生成、metric 中間表現の正規化詳細、Playwright 操作詳細 |
| `src/features/queueing/` | SQS message body の生成、検証 | SQS 送受信、repository 定義読み込み、スクレイピング実行 |
| `src/features/notifications/` | Discord 通知用メッセージ生成、通知表示用の入力型 | HTTP 通信、スクレイピング実行、スクレイピング定義 |
| `src/shared/infra/` | Lambda/SQS 境界の型、handler ごとの設定解決、SQS 送信 adapter | 個別 feature の値、message body の業務形式、dataSource 単位実行制御 |
| `src/local-runner.ts` | `.env` を使ったローカル起動 | 本番 Lambda 固有の制御、ジョブ内部処理 |

## 依存方向

```text
orchestrator -> jobs -> shared/infra/sqs
sqs-worker -> jobs
features -> packages/libs/browser
jobs -> packages/integrations/*
```

- `features/<feature-a>` から `features/<feature-b>` を import しない。
- 外部サービス連携は `packages/integrations/*` の公開 API に委譲する。
- 複数 feature を組み合わせる処理は `jobs/` に置く。
- スクレイピング対象の静的定義は `repositories/anime/data.ts` に置き、イベントには定義本体を持たせない。
- 外部公開用ではない metric 中間表現の型、正規化は app 内の `src/shared/intermediate/metric/metric.ts` に置く。
- JSON から metric への変換は `src/features/scrape-api/`、HTML から metric への変換は `src/features/scrape-webpage/` が扱う。
- Webpage の Playwright-core / Chromium 実行と HTML 取得は `packages/libs/browser` が扱う。
- SQS message body は app 内の `src/features/queueing/message.ts` で生成、検証する。Queue 送信そのものは `src/shared/infra/sqs.ts` が扱う。
- SQS は Standard Queue を使う。順序は要求せず、message の再試行と DLQ は AWS 側に委譲する。
- Worker Lambda handler は SQS event を dataSource スクレイピング job へ渡すだけにする。SQS record ごとの実行制御と partial batch response は dataSource スクレイピング job が扱う。
- DB 登録に必要な `newTitles`、`scrapingHistory`、`scrapedData` の永続化は後続タスクで adapter として追加する。
