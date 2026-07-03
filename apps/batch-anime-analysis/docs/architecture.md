# Batch Anime Analysis アーキテクチャ

`apps/batch-anime-analysis` は、`repositories` のアニメ関連スクレイピング定義を実行し、取得結果を Discord Webhook へ通知する app です。
現段階では Supabase 接続、DB 登録、SQS キューイングを持たず、後続のオーケストレーションから呼び出せるモジュールを優先します。

## 層と責務

| 層 | 置くもの | 置かないもの |
| --- | --- | --- |
| `src/lambda-handler.ts` | Lambda 共通エントリポイント、開始/終了ログ | ジョブ選択条件、スクレイピング詳細、外部連携詳細 |
| `src/routing/` | `job` の取得、正規化、ジョブ名に対応する handler への解決 | 各ジョブの処理内容、メッセージ生成、スクレイピング詳細 |
| `src/jobs/` | イベント値の正規化、repository の定義取得、取得方式の選択、raw data 取得と metric parser のオーケストレーション、Discord 通知、共通レスポンス作成 | セレクタ解釈、ブラウザ操作詳細 |
| `repositories/anime/` | アニメ指標スクレイピング定義、定義読み込み、定義検証 | Lambda イベント解釈、取得方式の選択、raw data 取得、Webhook URL 解決、DB 登録、通知文生成、metric 中間表現の正規化詳細、Playwright 操作詳細 |
| `src/features/anime-notifications/` | Discord 通知用メッセージ生成、通知表示用の入力型 | HTTP 通信、スクレイピング実行、スクレイピング定義 |
| `src/shared/infra/` | Lambda 型、secret 解決 | 個別 feature の値、外部サービス固有の型 |
| `src/local-runner.ts` | `.env` を使ったローカル起動 | 本番 Lambda 固有の制御、ジョブ内部処理 |

## 依存方向

```text
lambda-handler -> routing -> jobs -> features
features -> packages/libs/browser
jobs -> packages/integrations/*
```

- `features/<feature-a>` から `features/<feature-b>` を import しない。
- 外部サービス連携は `packages/integrations/*` の公開 API に委譲する。
- 複数 feature を組み合わせる処理は `jobs/` に置く。
- スクレイピング対象の静的定義は `repositories/anime/data.ts` に置き、イベントには定義本体を持たせない。
- 外部公開用ではない metric 中間表現の型、正規化は app 内の `src/shared/intermediate/metric.ts` に置く。
- JSON/HTML から metric への変換は app 内の `src/features/metric-parser/` が扱う。
- Webpage の Playwright-core / Chromium 実行と HTML 取得は `packages/libs/browser` が扱う。
- DB 登録に必要な `newTitles`、`scrapingHistory`、`scrapedData` の永続化は後続タスクで adapter として追加する。
