# Batch Playground アーキテクチャ

`apps/batch-playground` は、Lambda イベントの `job` に応じてバッチジョブを実行するアプリです。
`infra/sst.config.ts` が Lambda と EventBridge Scheduler を定義し、定期実行イベントから `job` を渡します。
複数 app で共有するお題候補などの静的データは `repositories` に置き、app からは repository 経由で読み込みます。

## 層と責務

| 層 | 置くもの | 置かないもの |
| --- | --- | --- |
| `src/handlers/batch.ts` | Lambda 共通エントリポイント、開始/終了ログ | ジョブ選択条件、業務ロジック、外部連携詳細 |
| `src/routing/` | `job` の取得、正規化、ジョブ名に対応する handler への解決 | 各ジョブの処理内容、メッセージ生成、外部 API 詳細 |
| `src/jobs/` | イベント値の正規化、feature 呼び出し、integration 呼び出し、共通レスポンス作成 | ルーティング判定、内部処理の詳細、外部 API 詳細 |
| `src/features/<concern>/` | 機能単位の処理、抽選重みやテンプレートなどの feature 固有設定値 | Lambda イベント解釈、バッチレスポンス作成、共有する静的データの定義、別 feature の実装 |
| `repositories/playground/` | 複数 app で共有するお題候補の静的カタログ、候補読み込み | Lambda イベント解釈、お題選択、メッセージ生成、抽選重みやテンプレートの保持、外部送信 |
| `src/shared/infra/` | Lambda など実行基盤に近い共通型、linked secret 解決、薄い補助処理 | 個別 feature の値、外部サービス固有の型 |
| `src/local-runner.ts` | `.env` を使ったローカル起動 | 本番 Lambda 固有の制御、ジョブ内部処理 |

## 依存方向

```text
batch -> routing -> jobs -> features
jobs -> packages/integrations/*
jobs/features -> packages/libs
features -> repositories
```

- `features/<feature-a>` から `features/<feature-b>` を import しない。
- 外部サービス連携は `packages/integrations/*` の公開 API に委譲する。
- 複数 feature を組み合わせる処理は `jobs/` に置く。
- Lambda に関する型は `src/shared/infra` に置く。
- お題候補の静的カタログは `repositories/playground/data.ts` に置き、feature からは `topicEntryRepository` 経由で読み込む。抽選重みやメッセージテンプレートは feature 側の設定として持つ。
- 現時点では app 内に `shared/domains` を作らない。複数 app で共有する業務関心が必要になったら `packages/domain` を検討する。

## 関心ごとのディレクトリ

- `features/` の直下には実装ファイルを置かず、必ず関心ごとのディレクトリを切る。
- feature はバッチ名や業務機能名で切る。例: `src/features/uma-one-draw-topic/`
- `index.ts` は作らない。責務が見えなくなるため、バレルファイルも禁止する。
- ファイル名は責務が一目で分かる名前にする。例: `src/features/uma-one-draw-topic/topic-message.ts`
- 設定値と処理は分ける。例: `topic-settings.ts` と `topic-message.ts`
- `src/shared` 直下には原則ファイルを置かない。
