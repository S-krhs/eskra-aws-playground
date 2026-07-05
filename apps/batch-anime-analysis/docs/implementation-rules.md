# Batch Anime Analysis 実装ルール

このドキュメントは `apps/batch-anime-analysis` 固有の実装ルールを定義します。
共通ルールは `../../../docs/implementation-rules.md` を参照します。

## ジョブ実装

- ジョブ名は実行内容が分かるバッチ名にする。例: `anime-scraping-data-source`
- ジョブ handler はイベント値の正規化、feature 呼び出し、integration 呼び出し、共通レスポンス作成に集中する。
- `jobs/` には実行単位のオーケストレーションを置き、message body の生成、検証などの機能単位は `features/` に置く。
- オーケストレーション手順は、処理セクションごとに 1 行コメントを残す。
- 新しいジョブを追加したら、app `README.md` の実行できるジョブと環境変数を更新する。

## SQS オーケストレーション

- Orchestrator Lambda は実行対象の決定と SQS 投入に集中し、スクレイピングを直接実行しない。
- Worker Lambda handler は SQS event を dataSource スクレイピング job へ渡すだけにし、message body の解釈や業務処理を持たない。
- SQS message body の生成、検証は `src/shared/schemas/queue-messages/data-source-message.ts` に集約する。
- SQS 送信は `src/shared/infra/sqs.ts` に置き、queue URL 解決は handler ごとの設定解決として `src/shared/infra/secrets.ts` に置く。
- dataSource スクレイピング job は SQS event 内の record を処理し、partial batch response で失敗 message だけを再試行対象にする。

## アラート通知

- バッチ失敗の通知は、CloudWatch alarm を SNS 経由で受ける Notifier Lambda が扱う。
- SNS event の解釈と通知失敗の握り潰しは `src/handlers/alarm-notifier.ts` に置く。通知自体の失敗で SNS 再試行を誘発しないよう、ログに留めて握り潰す。
- 通知文生成は `src/features/notifications/alarm-report.ts`、送信の組み立ては `src/jobs/alarm-notification.ts` に置く。
- アラート用 Webhook URL の解決は handler ごとの設定解決として `src/shared/infra/secrets.ts` に置く。

## 入力・レスポンス・ログ

- `LambdaEvent` は外部入力として扱い、使う直前に型チェック、trim、正規化を行う。
- repository 由来の入力は repository 境界で検証し、app 内では camelCase の型として扱う。
- レスポンスは `BatchResponse` に合わせ、呼び出し元が機械的に扱える形にする。
- `details` には調査に役立つ安全な情報だけを入れる。
- URL や Discord Webhook URL をログやレスポンスに出さない。
- 設定不足、入力不備、外部 API 失敗はエラーメッセージで区別できるようにする。

## Feature

- feature は app の業務機能に集中し、Lambda イベントや Webhook URL 解決を扱わない。
- feature から別 feature を import しない。
- 外部公開用ではない metric 中間表現の型、正規化は app 内の `src/shared/intermediate-models/metric/metric.ts` を使う。
- JSON から metric への変換は `src/features/scrape-api/`、HTML から metric への変換は `src/features/scrape-webpage/` を使う。
- repository のスクレイピング定義は、job で metric parser の入力指定へ変換する。
- Playwright-core / Chromium の Webpage 実行と HTML 取得は `packages/libs/browser` に委譲する。
- DB client、SQL、テーブル行構造は app に置かない。DB 登録は repository 境界に閉じ込める。
