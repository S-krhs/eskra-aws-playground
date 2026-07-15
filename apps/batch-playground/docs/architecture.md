# Batch Playground アーキテクチャ

`apps/batch-playground` は、Lambda イベントの `job` に応じてバッチジョブを実行するアプリです。
`infra/sst.config.ts` が Lambda と EventBridge Scheduler を定義し、定期実行イベントから `job` を渡します。
複数 app で共有するお題候補などの静的データは `repositories` に置き、app からは repository 経由で読み込みます。

## 層と責務

Lambda エントリポイント（handler）ごとに `src/handlers/<handler>/` を切り、その配下に handler・routes・schema・jobs を置きます。
現在の handler は `batch`（scheduler 起動の共通バッチ）と `function-url`（HTTP リクエストを受ける Function URL 公開エンドポイント）の 2 つで、job ごとに Lambda は増やしません。

| 層 | 置くもの | 置かないもの |
| --- | --- | --- |
| `src/handlers/<handler>/handler.ts` | Lambda エントリポイント、起動イベントの検証、担当 job への解決と委譲 | 業務ロジック、外部連携詳細 |
| `src/handlers/<handler>/routes.ts`（handler 内で複数ルートを持つ場合のみ） | interaction の custom_id prefix など、リクエスト内容から担当 feature への解決 | 各ジョブの処理内容、メッセージ生成、外部 API 詳細 |
| `src/handlers/<handler>/jobs/`（複数 job を持つ handler のみ） | イベント値の正規化、feature 呼び出し、integration 呼び出し、共通レスポンス作成 | ルーティング判定、内部処理の詳細、外部 API 詳細 |
| `src/handlers/<handler>/schema.ts` | その handler の起動イベント・実行 context 検証 schema と応答型 | ジョブ判定、外部サービス固有の型 |
| `sst-resource-links.d.ts`（package root） | SST link した secret を `Resource` proxy 経由で型付き参照するための declaration | 実行時の値解決、環境変数として渡す設定の型 |
| `src/features/<concern>/` | 機能単位の処理、抽選重みやテンプレートなどの feature 固有設定値。複数 handler から共有できる | Lambda イベント解釈、バッチレスポンス作成、共有する静的データの定義、別 feature の実装 |
| `repositories/playground/` | 複数 app で共有するお題候補の静的カタログ、候補読み込み | Lambda イベント解釈、お題選択、メッセージ生成、抽選重みやテンプレートの保持、外部送信 |

## 依存方向

```text
handlers/batch:        handler -> jobs -> features
handlers/function-url: handler -> routes -> features
jobs -> packages/integrations/*
jobs/features -> packages/libs
features -> repositories
```

- handler ツリー間で import しない。共有するものは `src/features/` か `packages/*` に置く。
- `features/<feature-a>` から `features/<feature-b>` を import しない。
- 外部サービス連携は `packages/integrations/*` の公開 API に委譲する。
- 複数 feature を組み合わせる処理は `jobs/` に置く。
- Lambda の起動イベント検証 schema と応答型は `src/handlers/<handler>/schema.ts` に置く。起動イベントは `unknown` として受け取り、schema で検証・正規化してから使う。
- linked secret は handler / job 内で `Resource.<name>.value` を直接読む。型は package root の `sst-resource-links.d.ts` で宣言する（SST 生成の `sst-env.d.ts` を commit で代替する形）。環境変数は `process.env.<NAME>` を直接読む。
- お題候補の静的カタログは `repositories/playground/data.ts` に置き、feature からは `topicEntryRepository` 経由で読み込む。抽選重みやメッセージテンプレートは feature 側の設定として持つ。
- 現時点では app 内に `shared/domains` を作らない。複数 app で共有する業務関心が必要になったら `packages/domain` を検討する。

## 関心ごとのディレクトリ

- `features/` の直下には実装ファイルを置かず、必ず関心ごとのディレクトリを切る。
- feature はバッチ名や業務機能名で切る。例: `src/features/uma-one-draw-topic/`
- `index.ts` は作らない。責務が見えなくなるため、バレルファイルも禁止する。
- ファイル名は責務が一目で分かる名前にする。例: `src/features/uma-one-draw-topic/topic-message.ts`
- 設定値と処理は分ける。例: `topic-settings.ts` と `topic-message.ts`
