# Batch Playground アーキテクチャ

`apps/batch-playground` は、Lambda イベントの `job` に応じてバッチジョブを実行するアプリです。
`infra/sst.config.ts` が Lambda と EventBridge Scheduler を定義し、定期実行イベントから `job` を渡します。
複数 app で共有するお題候補などの静的データは `repositories` に置き、app からは repository 経由で読み込みます。

## 層と責務

Lambda エントリポイント（handler）ごとに `src/handlers/<handler>/` を切ります。batch handler は `jobs/`、function-url handler は `routes/<route>/operations/` へ処理を委譲します。
現在の handler は `batch`（scheduler 起動の共通バッチ）と `function-url`（HTTP リクエストを受ける Function URL 公開エンドポイント）の 2 つで、job ごとに Lambda は増やしません。

| 層 | 置くもの | 置かないもの |
| --- | --- | --- |
| `src/handlers/<handler>/handler.ts` | Lambda エントリポイント、起動イベントの envelope 検証、ルーティングキーから担当 job / route への解決と委譲 | route / job 固有の詳細 parse、業務ロジック、外部連携詳細 |
| `src/handlers/batch/jobs/` | batch job 固有のイベント詳細 parse、feature 呼び出し、integration 呼び出し、共通レスポンス作成 | envelope 検証、job の振り分け、外部 API 詳細 |
| `src/handlers/function-url/routes/<route>/route.ts` | request envelope の parse、認証・認可、parse 済み interaction type から operation への振り分け、HTTP response の形成 | Discord interaction body の parse・payload 構築、feature の直接呼び出し、type 固有のオーケストレーション、メッセージ生成 |
| `src/handlers/function-url/routes/<route>/operations/` | interaction type 固有のオーケストレーション、feature 呼び出し | route の選択、認証・認可、HTTP response の形成、別 operation の呼び出し |
| `src/handlers/<handler>/schema.ts` | その handler の起動イベント・実行 context 検証 schema と応答型 | ジョブ判定、外部サービス固有の型 |
| `src/external-protocols/<service>/` | 外部サービス固有 payload の parse・build、署名検証など、通信を伴わない protocol 処理 | HTTP 通信、secret の解決、業務ルール |
| `sst-resource-links.d.ts`（package root） | SST link した secret を `Resource` proxy 経由で型付き参照するための declaration | 実行時の値解決、環境変数として渡す設定の型 |
| `src/features/<concern>/` | 機能単位の処理、抽選重みやテンプレートなどの feature 固有設定値。複数 handler から共有できる | Lambda イベント解釈、バッチレスポンス作成、共有する静的データの定義、別 feature の実装 |
| `repositories/playground/` | 複数 app で共有するお題候補の静的カタログ、候補読み込み | Lambda イベント解釈、お題選択、メッセージ生成、抽選重みやテンプレートの保持、外部送信 |

## 依存方向

```text
handlers/batch:        handler -> jobs -> features
handlers/function-url: handler -> routes -> operations -> features
routes/operations -> external-protocols
jobs -> external-protocols
jobs -> packages/integrations/*
jobs/features -> packages/libs
features -> repositories
```

- handler ツリー間で import しない。共有するものは `src/features/` か `packages/*` に置く。
- `features/<feature-a>` から `features/<feature-b>` を import しない。
- 外部 protocol の表現変換は `src/external-protocols/*`、実通信は `packages/integrations/*` の公開 API に委譲する。integration へは構築済み payload を渡す。
- 複数 feature を組み合わせる処理は batch では `jobs/`、function-url では `operations/` に置く。
- Lambda の起動イベント検証 schema と応答型は `src/handlers/<handler>/schema.ts` に置く。起動イベントは `unknown` として受け取り、schema で検証・正規化してから使う。
- handler は envelope 検証と routing のみを行う。function-url のroute固有処理は `routes/<route>/route.ts` に置き、routeからfeatureを直接呼び出さずoperationへ委譲する。
- linked secret は handler / job 内で `Resource.<name>.value` を直接読む。型は package root の `sst-resource-links.d.ts` で宣言する（SST 生成の `sst-env.d.ts` を commit で代替する形）。環境変数は `process.env.<NAME>` を直接読む。
- お題候補の静的カタログは `repositories/playground/data.ts` に置き、feature からは `topicEntryRepository` 経由で読み込む。抽選重みやメッセージテンプレートは feature 側の設定として持つ。
- 現時点では app 内に `shared/domains` を作らない。複数 app で共有する業務関心が必要になったら `packages/domain` を検討する。

## 関心ごとのディレクトリ

- `features/` の直下には実装ファイルを置かず、必ず関心ごとのディレクトリを切る。
- feature はバッチ名や業務機能名で切る。例: `src/features/uma-one-draw-topic/`
- `index.ts` は作らない。責務が見えなくなるため、バレルファイルも禁止する。
- ファイル名は責務が一目で分かる名前にする。例: `src/features/uma-one-draw-topic/topic-message.ts`
- 設定値と処理は分ける。例: `topic-settings.ts` と `topic-message.ts`
