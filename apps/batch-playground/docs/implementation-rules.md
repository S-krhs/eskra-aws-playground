# Batch Playground 実装ルール

このドキュメントは `apps/batch-playground` 固有の実装ルールを定義します。
共通ルールは `../../../docs/implementation-rules.md` を参照します。

## ジョブ実装

- ジョブ名は実行内容が分かるバッチ名にする。例: `uma-one-draw-topic`
- `src/routing/batch-router.ts` の `resolveBatchJob` にジョブ名と handler を追加する。
- ジョブ handler は実行時設定の解決、feature 呼び出し、integration 呼び出し、共通レスポンス作成に集中する。
- job ごとの実行時設定の解決は `src/jobs/runtime-settings/<job>-setting-resolver.ts` に置く。
- オーケストレーション手順は、処理セクションごとに 1 行コメントを残す。
- 新しいジョブを追加したら、app `README.md` の実行できるジョブと環境変数を更新する。

## 入力・レスポンス・ログ

- 起動イベントは `unknown` として受け取り、routing で使う直前に schema で検証・正規化する。
- レスポンスは `BatchResponse` に合わせ、呼び出し元が機械的に扱える形にする。
- 境界データの型・契約は `src/shared/schemas/` に置く（Lambda handler は `lambda/<handler>/event.ts`・`response.ts`）。実行時設定の型と解決は `src/jobs/runtime-settings/` に置き、外部システムと話す実装は `packages/integrations/*` に置く。
- `details` には調査に役立つ安全な情報だけを入れる。
- 開始/終了ログには、ジョブ名や URL の有無など安全な値だけを出す。
- 設定不足、入力不備、外部 API 失敗はエラーメッセージで区別できるようにする。

## Feature

- feature は app の業務機能に集中し、Lambda イベントや Webhook URL 解決を扱わない。
- feature から別 feature を import しない。
- feature 間で共有したい処理が出た場合は、まず重複を許容できるか確認する。
- 継続的に共有する純粋処理は `packages/libs`、複数 app で共有する業務関心は将来の `packages/domain` へ移す。
