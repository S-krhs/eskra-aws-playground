---
paths:
  - "apps/batch-playground/**"
  - "repositories/playground/**"
---

# Batch Playground

Lambda イベントの `job` に応じてバッチジョブを実行する app です。`infra/sst.config.ts` が Lambda と EventBridge Scheduler、interaction ジョブ用の SQS Queue を定義し、定期実行イベントから `job` を渡します。
handler は `batch`(scheduler 起動の共通バッチ)、`function-url`(HTTP リクエストを受ける Function URL 公開エンドポイント)、`sqs-worker`(deferred 応答済み interaction の後追い処理)の 3 つで、job ごとに Lambda は増やしません。

## Interaction の応答方式

Discord interaction は 3 秒以内に応答しないと失敗するため、`function-url` では確定応答を作らず deferred で ACK し、実処理は SQS の後追いジョブへ渡します。

- application command は deferred message(type 5。ephemeral にする場合のみ `flags` を付ける)、message component は deferred update(type 6)で ACK する。
- deferred type を持たない PING と autocomplete は、その場で確定応答を返す。DB も外部通信も伴わない入力検証エラーも即時応答でよい。
- 確定メッセージの生成と送信は `sqs-worker` の job が担当し、interaction token で元メッセージを差し替える。Bot token は使わない。
- interaction token は 15 分で失効する。後追いジョブのリトライはこの範囲に収める。

## 層と責務

| 層 | 置くもの | 置かないもの |
| --- | --- | --- |
| `src/handlers/<handler>/handler.ts` | Lambda エントリポイント、起動イベントの envelope 検証、ルーティングキーから担当 job / route への解決と委譲 | route / job 固有の詳細 parse、業務ロジック、外部連携詳細 |
| `src/handlers/batch/contracts/job-names.ts` | batch handler が受け付ける job 名の一元管理 | job の実装、実行スケジュール |
| `src/handlers/batch/jobs/` | batch job 固有のイベント詳細 parse、feature・repository・integration 呼び出し、共通レスポンス作成 | envelope 検証、job の振り分け、外部 API 詳細 |
| `src/handlers/function-url/contracts/paths.ts` | function-url が公開する path の一元管理 | route の実装 |
| `src/handlers/function-url/routes/<route>/route.ts` | request envelope の parse、認証・認可、interaction type から operation への振り分け、HTTP response の形成 | Discord interaction body の parse・payload 構築、feature の直接呼び出し、type 固有のオーケストレーション |
| `src/handlers/function-url/routes/<route>/operations/` | interaction type 固有のオーケストレーション、feature・repository・integration 呼び出し、後追いジョブ message の組み立てと enqueue、deferred ack の生成 | route の選択、署名検証、HTTP response の形成、別 operation の呼び出し、確定メッセージの生成 |
| `src/handlers/sqs-worker/jobs/` | interaction ジョブ固有の実処理、確定メッセージの生成、feature・repository・integration 呼び出し | SQS event の検証、ジョブの振り分け、route で済んだ入力検証 |
| `src/handlers/function-url/routes/<route>/contracts/` | その Bot のスラッシュコマンド契約(`commands.ts`・`prefixes.ts`。CD が deploy 後に global scope へ同期) | コマンドの実行処理 |
| `src/handlers/function-url/routes/intermediate-models/` | operation 結果の中間表現(`operation-result.ts`) | HTTP response の形成、operation の実装 |
| `src/handlers/<handler>/schema.ts` | その handler の起動イベント・実行 context 検証 schema と応答型 | ジョブ判定、外部サービス固有の型 |
| `src/external-protocols/<protocol>/` | 外部サービス固有 payload の parse・build、署名検証など、通信を伴わない protocol 処理 | HTTP 通信、secret の解決、業務ルール |
| `src/scripts/` | `sst shell` 経由で実行する運用スクリプト(`sync-discord-commands.ts`) | Lambda から呼ばれる処理 |
| `sst-resource-links.d.ts`(package root) | SST link した secret を `Resource` proxy 経由で型付き参照するための declaration | 実行時の値解決 |
| `src/features/<concern>/` | 機能単位の処理、抽選重みやテンプレートなどの feature 固有設定値。複数 handler から共有できる | Lambda イベント解釈、バッチレスポンス作成、別 feature の実装 |
| `src/shared/contracts/interaction-job-names.ts` | sqs-worker が受け付ける interaction ジョブ名の一元管理 | ジョブの実装、message の構築 |
| `src/shared/schemas/sqs/<queue>/message.ts` | handler ツリーをまたぐ SQS message の外部入力 schema と型 | SQS 送受信、ジョブの実行、Discord API 通信 |
| `repositories/playground/` | 複数 app で共有する静的カタログと DB 設定、その取得・保存・JSONB 検証 | Lambda イベント解釈、メッセージ生成、外部送信、Discord 権限判定 |

## 依存方向

```text
handlers/batch:        handler -> jobs -> features / repositories / integrations
handlers/function-url: handler -> routes -> operations -> features / repositories
handlers/sqs-worker:   handler -> jobs -> features / repositories / integrations
routes/operations -> packages/integrations/*
routes/operations -> external-protocols
jobs -> external-protocols
jobs -> packages/integrations/*
jobs/features -> packages/libs
routes/operations -> shared
jobs -> shared
features -> repositories
```

- handler ツリー間で import しない。共有するものは `src/features/`(機能単位の処理)、`src/shared/`(handler をまたぐ公開契約)、`packages/*` のいずれかに置く。function-url と sqs-worker が共有する interaction ジョブの job 名と message schema は `src/shared/` に置く。
- route から feature を直接呼び出さない。依存方向は必ず `route -> operation -> feature` とする。
- 複数 feature の組み合わせや repository・integration の呼び出し順序は、batch では `jobs/`、function-url では `operations/` に置く。単なる repository 転送だけの feature は作らない。

## 実装ルール

- job 名は実行内容が分かるバッチ名(例: `uma-one-draw-topic`)にし、`contracts/job-names.ts` へ追加して `handler.ts` の `batchJobs` 対応表に登録する。
- interaction ジョブを追加するときは `shared/contracts/interaction-job-names.ts` に job 名、`shared/schemas/sqs/interaction-job/message.ts` にその job が必要とする値だけの message を追加し、`handlers/sqs-worker/handler.ts` の振り分けへ登録する。message には interaction token を載せるため、ログや `details` へ出さない。
- operation から enqueue するときは message を `InteractionJobMessage` として宣言してから `SqsMessageSender` へ渡す。`SqsMessageInput` の `body` は `unknown` のため、型注釈がないと契約違反を検出できない。
- sqs-worker は record 単位で失敗を分離し、失敗した message だけを `batchItemFailures` で再試行対象にする。
- 起動イベントは `unknown` として受け取り、`schema.ts` で検証・正規化してから使う。レスポンスは `BatchResponse` に合わせ、呼び出し元が機械的に扱える形にする。
- linked secret は handler / job 内で `Resource.<name>.value` を直接読み、型は `sst-resource-links.d.ts` に宣言を追加する。環境変数は `process.env.<NAME>` を直接読む。
- operation は `routes/<route>/operations/<operation>-operation.ts` に置き、1 ファイルにつき 1 メソッドとする。定数結果を返すだけの薄い operation は作らず、route の振り分けへインライン化する。
- 同じ protocol の Parse / Build は同一モジュールにまとめ、役割名だけが異なる薄い Builder / Parser module へ分割しない。integration へは構築済み payload を渡す。テストは対象ファイルと同じディレクトリに置く。
- お題候補の静的カタログは `repositories/playground/data.ts` に置き、feature からは repository 経由で読む。抽選重みやメッセージテンプレートは feature 側の設定として持つ。
- feature 間で共有したい処理が出た場合は、まず重複を許容できるか確認する。`src/shared/` は handler をまたぐ契約(job 名・schema・中間モデル)だけを置く場所とし、業務ロジックを持つ `shared/domains` は作らない。
- `features/` 直下に実装ファイルを置かず、関心ごとのディレクトリを切る。設定値と処理はファイルを分ける(例: `topic-settings.ts` と `topic-message.ts`)。
- オーケストレーション手順は、処理セクションごとに 1 行コメントを残す。
- `details` と開始/終了ログには調査に役立つ安全な値だけを入れ、設定不足・入力不備・外部 API 失敗はエラーメッセージで区別できるようにする。
- 新しい job を追加したら、app `README.md` の実行できるジョブと環境変数を更新する。
