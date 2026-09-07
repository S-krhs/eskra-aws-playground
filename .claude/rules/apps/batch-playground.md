---
paths:
  - "apps/batch-playground/**"
  - "repositories/playground/**"
---

# Batch Playground

Lambda イベントの `job` に応じてバッチジョブを実行する app です。`infra/sst.config.ts` が Lambda と EventBridge Scheduler、interaction ジョブ用の SQS Queue を定義し、定期実行イベントから `job` を渡します。
handler は `batch`(scheduler 起動の共通バッチ)、`sqs-worker`(deferred 応答済み interaction の後追い処理)、`media-sync`(R2 とメタデータの同期)、`media-thumbnail`(サムネイル生成)の 4 つです。`batch` は job ごとに Lambda を増やしませんが、共通バッチの timeout(60 秒)や layer に収まらないものは専用 Function にします。Discord interaction を受ける公開エンドポイントは別 app の `function-url-playground` が担い、その後追いジョブをこの app の `sqs-worker` が処理します。

## Interaction 後追いジョブ(sqs-worker)

`function-url-playground` は Discord interaction を 3 秒以内に deferred ACK し、実処理を SQS へ渡します。`sqs-worker` はその後追いジョブを受け、確定メッセージを生成して interaction token で元メッセージを差し替えます。

- 確定メッセージの生成と送信は `sqs-worker` の job が担当する。Bot token は使わず、応答先は message が持つ `application_id` と `token` から解決する。
- interaction token は 15 分で失効する。後追いジョブのリトライはこの範囲に収める。
- job 名と message schema は producer(function-url-playground)と共有するため `@eskra-aws-playground/shared-domains/contracts`(`interaction-job-names` / `interaction-job-message`)に置く。

## メディアライブラリの同期(media-sync / media-thumbnail)

R2 に置かれたメディアをメタデータへ反映し、サムネイルを生成します。設計の背景は `repositories/media/README.md` を参照します。

- `ListObjectsV2` は custom metadata を返さない。既知の key は一覧だけで突き合わせ、**未知の key にだけ `HeadObject` を打つ**。全件に打つ実装にしない。
- 未知の key は metadata の `media-id` で新規・移動・取り込みへ振り分ける。`media-id` を持たないものだけ UUID を採番して `_inbox/` へ取り込む。
- 移動は「古い key の欠落」としても現れる。削除の対象から必ず外す。
- 走査から `_thumb/` と対象外の拡張子を除く。サムネイルを取り込むと 1 件につき 2 行が登録され、メディアでないファイルを取り込むとサムネイル生成が毎回失敗して DLQ が埋まり続ける。
- **消す前に規模を確かめる。** 行を消すとタグの紐付けも道連れになり、手で付けたタグは復元できない。一覧が空、または一度に消える割合が大きすぎる場合は削除せずエラーにする。歯止めは削除だけに掛け、取り込みと移動は毎回通す。正当な大量削除は `{ "allowBulkDelete": true }` の手動起動で越える。
- 移動は「元の key が消えている」ことまで確かめる。metadata ごと複製されると同じ `media-id` が 2 つの key に載り、確かめないと `objectKey` が実行のたびに入れ替わる。
- 取り込みの Delete が失敗したら、複製した方を戻して次の実行へ持ち越す。元が残ったままだと同じ中身に 2 つの UUID と行ができる。
- サムネイルの key は UUID から導く。DB の `thumbnailKey` が空でも消し忘れない。
- 一覧と `HeadObject` の間で消えた object は飛ばす。1 件の 404 で同期全体を落とさない。
- object metadata は誰でも書ける。`media-id` を主キーへ入れる前に UUID として検証する。
- 同じ key のまま差し替えられた場合は etag だけが変わる。突き合わせに etag を含め、差し替わったものはサムネイルと寸法を作り直す。
- 行を消す前に、その行が持つサムネイルを R2 から消す。消した後は走査から辿れなくなる。
- 同期は共通バッチの job にせず専用 Function にする。10 万件の upsert が 60 秒に収まらない。
- 終了を書けずに落ちた実行で詰まらないよう、Lambda の timeout より後ろの閾値を超えた実行中の記録は打ち切り扱いにする。
- ffmpeg / ffprobe は layer が `/opt/bin` へ置く。パスは実行時に解決し、ローカル検証で差し替えられるようにする。
- サムネイルは画像も動画も ffmpeg で作る。sharp を持ち込まない。

## 層と責務

| 層 | 置くもの | 置かないもの |
| --- | --- | --- |
| `src/handlers/<handler>/handler.ts` | Lambda エントリポイント、起動イベントの envelope 検証、ルーティングキーから担当 job への解決と委譲 | job 固有の詳細 parse、業務ロジック、外部連携詳細 |
| `src/handlers/batch/contracts/job-names.ts` | batch handler が受け付ける job 名の一元管理 | job の実装、実行スケジュール |
| `src/handlers/batch/jobs/` | batch job 固有のイベント詳細 parse、feature・repository・integration 呼び出し、共通レスポンス作成 | envelope 検証、job の振り分け、外部 API 詳細 |
| `src/handlers/sqs-worker/jobs/` | interaction ジョブ固有の実処理、確定メッセージの生成、feature・repository・integration 呼び出し | SQS event の検証、ジョブの振り分け、producer 側で済んだ入力検証 |
| `src/handlers/<handler>/schema.ts` | その handler の起動イベント・実行 context 検証 schema と応答型 | ジョブ判定、外部サービス固有の型 |
| `sst-resource-links.d.ts`(package root) | SST link した secret を `Resource` proxy 経由で型付き参照するための declaration | 実行時の値解決 |
| `src/features/<concern>/` | 機能単位の処理、抽選重み・テンプレート・button style などの feature 固有設定値。複数 handler から共有できる | Lambda イベント解釈、バッチレスポンス作成、別 feature の実装 |
| `repositories/playground/` | 複数 app で共有するガチャ候補と DB 設定、その取得・保存・検証 | Lambda イベント解釈、メッセージ生成、外部送信、Discord 権限判定 |

handler ツリーをまたぐ interaction ジョブの契約(job 名・message schema)や、producer と共有する custom_id 規約・prefix・choice カタログ・button tone は `@eskra-aws-playground/shared-domains` に置く。Discord の parse・署名検証・応答型・送信 client は `@eskra-aws-playground/integration-discord` を使う。

## 依存方向

```text
handlers/batch:      handler -> jobs -> features / repositories / integrations
handlers/sqs-worker: handler -> jobs -> features / repositories / integrations
jobs / features -> packages/integrations/*
jobs / features -> packages/libs
jobs / features -> shared-domains
features -> repositories
```

- handler ツリー間で import しない。共有するものは `src/features/`(機能単位の処理)、`shared-domains`(app をまたぐ契約・ドメインデータ)、`packages/*` のいずれかに置く。
- 複数 feature の組み合わせや repository・integration の呼び出し順序は `jobs/` に置く。単なる repository 転送だけの feature は作らない。

## 実装ルール

- job 名は実行内容が分かるバッチ名(例: `uma-one-draw-topic`)にし、`contracts/job-names.ts` へ追加して `handler.ts` の `batchJobs` 対応表に登録する。
- interaction ジョブを追加するときは `shared-domains/contracts/interaction-job-names.ts` に job 名、`shared-domains/contracts/interaction-job-message.ts` にその job が必要とする値だけの message を追加し、`handlers/sqs-worker/handler.ts` の振り分けへ登録する。message には interaction token を載せるため、ログや `details` へ出さない。
- sqs-worker は record 単位で失敗を分離し、失敗した message だけを `batchItemFailures` で再試行対象にする。
- 起動イベントは `unknown` として受け取り、`schema.ts` で検証・正規化してから使う。レスポンスは `BatchResponse` に合わせ、呼び出し元が機械的に扱える形にする。
- linked secret は handler / job 内で `Resource.<name>.value` を直接読み、型は `sst-resource-links.d.ts` に宣言を追加する。環境変数は `process.env.<NAME>` を直接読む。
- Discord へ送るメッセージ payload の生成は feature に置く。button の tone→style 変換(`button-styles.ts`)は `ButtonTone`(shared-domains)と `DiscordButtonComponent`(integration-discord)を、custom_id の生成は shared-domains の `buildCustomId` を使う。
- お題候補は `playground.gacha_entities` に pool 単位で置き、feature からは `gachaEntityRepository` 経由で読む。抽選重みやメッセージテンプレートは feature 側の設定として持つ。
- feature 間で共有したい処理が出た場合は、まず重複を許容できるか確認する。app をまたぐ契約・ドメインデータは `shared-domains` へ置き、app 内に業務ロジックを持つ `shared/domains` は作らない。
- `features/` 直下に実装ファイルを置かず、関心ごとのディレクトリを切る。設定値と処理はファイルを分ける(例: `topic-settings.ts` と `topic-message.ts`)。
- オーケストレーション手順は、処理セクションごとに 1 行コメントを残す。
- `details` と開始/終了ログには調査に役立つ安全な値だけを入れ、設定不足・入力不備・外部 API 失敗はエラーメッセージで区別できるようにする。
- 新しい job を追加したら、app `README.md` の実行できるジョブと環境変数を更新する。
