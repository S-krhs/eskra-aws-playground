# Batch Anime Analysis 実装ルール

このドキュメントは `apps/batch-anime-analysis` 固有の実装ルールを定義します。
共通ルールは `../../../docs/implementation-rules.md` を参照します。

## ジョブ実装

- ジョブ名は実行内容が分かるバッチ名にする。例: `anime-scraping-preview`
- `src/routing/batch-router.ts` の `resolveBatchJob` にジョブ名と handler を追加する。
- ジョブ handler はイベント値の正規化、feature 呼び出し、integration 呼び出し、共通レスポンス作成に集中する。
- オーケストレーション手順は、処理セクションごとに 1 行コメントを残す。
- 新しいジョブを追加したら、app `README.md` の実行できるジョブと環境変数を更新する。

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
- 外部公開用ではない metric 中間表現の型、正規化は app 内の `src/shared/intermediate/metric.ts` を使う。
- JSON/HTML から metric への変換は app 内の `src/features/metric-parser/` を使う。
- repository のスクレイピング定義は、job で metric parser の入力指定へ変換する。
- Playwright-core / Chromium の Webpage 実行と HTML 取得は `packages/libs/browser` に委譲する。
- Supabase 接続と DB 登録はこの app ではまだ実装しない。
