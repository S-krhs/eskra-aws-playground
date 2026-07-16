# Batch Playground 実装ルール

このドキュメントは `apps/batch-playground` 固有の実装ルールを定義します。
共通ルールは `../../../docs/implementation-rules.md` を参照します。

## ジョブ実装

- ジョブ名は実行内容が分かるバッチ名にする。例: `uma-one-draw-topic`
- `src/handlers/batch/handler.ts` の `batchJobs` にジョブ名とジョブを追加する。
- ジョブ handler は実行時設定の取得、feature 呼び出し、integration 呼び出し、共通レスポンス作成に集中する。
- linked secret は `Resource.<name>.value`、環境変数は `process.env.<NAME>` を handler / job 内で直接読む。secret の型は package root の `sst-resource-links.d.ts` に宣言を追加する。
- オーケストレーション手順は、処理セクションごとに 1 行コメントを残す。
- 新しいジョブを追加したら、app `README.md` の実行できるジョブと環境変数を更新する。

## Function URL route

- route は request envelope の parse、認証・認可、parse 済み interaction type から operation への振り分け、HTTP response の形成を担当する。Discord interaction body の parse と response payload 構築は `src/external-protocols/discord` に委譲する。
- route から feature を直接呼び出すことを禁止する。依存方向は必ず `route -> operation -> feature` とする。
- operation は `src/handlers/function-url/routes/<route>/operations/<operation>-operation.ts` に置き、1 ファイルにつき 1 メソッドとする。
- operation 内から別 operation を呼び出さない。type 固有のオーケストレーションは、その type を担当する operation 内で完結させる。
- 定数結果を返すだけの薄い operation は作らず、route の operation 振り分けへインライン化する。

## External protocol

- 外部サービス固有 payload の parse・build のうち、通信を伴わない処理は `src/external-protocols/<service>/` に置く。
- 同じ protocol を扱う Parse / Build は同一モジュールにまとめ、役割名だけが異なる薄い Builder / Parser module へ分割しない。
- 状態や lifecycle を持たない protocol 変換は純関数で実装し、class を導入しない。
- HTTP 通信や secret の解決は扱わない。構築済み payload の送信は `packages/integrations/*` に委譲する。
- テストは対象ファイルと同じディレクトリに置く。

## 入力・レスポンス・ログ

- 起動イベントは `unknown` として受け取り、schema で検証・正規化してから使う。
- レスポンスは `BatchResponse` に合わせ、呼び出し元が機械的に扱える形にする。
- Lambda 境界データの型・契約は `src/handlers/<handler>/schema.ts`、外部サービス固有の表現変換は `src/external-protocols/*`、実通信は `packages/integrations/*` に置く。
- `details` には調査に役立つ安全な情報だけを入れる。
- 開始/終了ログには、ジョブ名や URL の有無など安全な値だけを出す。
- 設定不足、入力不備、外部 API 失敗はエラーメッセージで区別できるようにする。

## Feature

- feature は app の業務機能に集中し、Lambda イベントや Webhook URL 解決を扱わない。
- feature から別 feature を import しない。
- feature 間で共有したい処理が出た場合は、まず重複を許容できるか確認する。
- 継続的に共有する純粋処理は `packages/libs`、複数 app で共有する業務関心は将来の `packages/domain` へ移す。
