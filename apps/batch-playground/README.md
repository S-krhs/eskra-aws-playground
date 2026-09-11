# Batch Playground

| handler | 起動 | 用途 |
| --- | --- | --- |
| `batch` | EventBridge Scheduler / 手動 invoke | `job` に応じた共通バッチ |
| `sqs-worker` | SQS | message の `job` に応じた後処理 |

## メディアライブラリの同期

同期は `batch` の `media-sync` job（15 分の専用 Function）です。オブジェクト単位で R2 を書き換える処理は
`media-sync` からは行わず、それぞれ専用の queue に載せて `sqs-worker` に渡します。

| job | 起動 | 用途 |
| --- | --- | --- |
| `media-sync` | Scheduler / `/media/sync` / 手動 invoke | R2 の一覧と DB の突き合わせ、DB への書き込み、下 2 つの依頼 |
| `media-thumbnail` | `MediaThumbnailQueue` | サムネイル生成（ffmpeg layer 付きの専用 Function） |
| `media-adopt` | `MediaAdoptQueue` | 外部から置かれたオブジェクトに UUID を付けて `_inbox/` へ移し、登録してサムネイルを依頼する |

- 接続先は環境変数 `R2_CREDENTIALS`(SST secret の `R2Credentials` を渡す JSON)と `MEDIA_BUCKET` から解決します。
- 管理ツールの同期ボタンは `function-url-playground` の `/media/sync` を叩き、そこから非同期 invoke されます。
- R2 の一覧が空、または一度に削除される割合が大きすぎる場合は削除せずエラーにします。内容を確認したうえで手動起動する場合は `{"job": "media-sync", "allowBulkDelete": true}` を渡します。
- サムネイル生成は 3 回の配信で成功しなければ諦め、対象を `_failed/` へ移して DLQ へ送ります。`MediaThumbnailDlqDepthAlarm` が鳴るのはこのときです。
- `_deleted/` は管理ツールのゴミ箱です。同期の走査からは外しません(外すと R2 から消えたものとして行が消えます)。
- `_failed/` は同期の対象から外れるので、放置しても再依頼はされません。原因を取り除いたうえで戻す手順:

  ```bash
  aws s3 mv s3://<bucket>/_failed/<key> s3://<bucket>/_pending/<key> --endpoint-url <r2-endpoint>
  ```

  次の `media-sync` が `_pending/` として拾い、サムネイルを依頼し直します。

## 実行できるジョブ

### `uma-one-draw-topic`

```json
{
  "job": "uma-one-draw-topic"
}
```

お題候補は `playground.gacha_entities` の `pool_key = uma-one-draw-topic` から読み出します。

### `uma-one-draw-topic-scheduler`

当日 JST 12:00-18:00 のランダムな時刻に `uma-one-draw-topic` を起動する one-time schedule を登録します。

```json
{
  "job": "uma-one-draw-topic-scheduler"
}
```

cron は JST 00:00 起動です。デプロイや障害で当日分が未登録の場合、JST 18:00 より前に上記 payload で Lambda を手動起動すると残り window 内で登録できます（18:00 以降はエラーになります）。

### `play-check-reminder`

毎日 JST 22:00 に schedule 起動し、登録済みの全ユーザーへメンションと選択ボタン付きで投稿します。

```json
{
  "job": "play-check-reminder"
}
```

- `/gamble-check-enable` を投稿先チャンネルで実行すると実行者本人の設定を登録・更新します。
- `/gamble-check-disable` は実行者本人の設定を削除します。

## 環境変数

デプロイ時に必要な SST secret（GitHub Actions secret → SST secret env）:

| GitHub Actions secret | SST secret env | 用途 |
| --- | --- | --- |
| `UMA_ONE_DRAW_TOPIC_DISCORD_WEBHOOK_URL` | `SST_SECRET_UmaOneDrawTopicDiscordWebhook` | batch: お題通知 |
| `YACCHO_DISCORD_BOT_TOKEN` | `SST_SECRET_YacchoDiscordBotToken` | batch: リマインダー投稿 |
| `DATABASE_URL` | `SST_SECRET_DatabaseUrl` | batch / sqs-worker: DB 接続 |
| `R2_CREDENTIALS` | `SST_SECRET_R2Credentials` | media-sync / media-thumbnail / media-adopt: R2 接続 |

secret ではない環境変数:

| 環境変数 | 渡す先 | 用途 |
| --- | --- | --- |
| `MEDIA_BUCKET` | media-sync / media-thumbnail / media-adopt | R2 の bucket 名 |
| `UMA_ONE_DRAW_TOPIC_SCHEDULE_GROUP_NAME` | batch | one-time schedule を登録する schedule group 名 |
| `UMA_ONE_DRAW_TOPIC_SCHEDULER_ROLE_ARN` | batch | Scheduler が Lambda を起動するときに引き受ける role |

いずれも値は `infra/sst.config.ts` が持ちます。`uma-one-draw-topic-scheduler` は後ろ 2 つが未設定だとエラーで終了します。

Discord interaction / command 同期用の secret は `apps/function-url-playground/README.md` を参照。

`sqs-worker` の interaction 系 job は Discord の interaction token を使うため、発行から 15 分以内に投稿を終える必要があります。3 回の配信で成功しなければ DLQ へ送られ、深さの alarm が鳴ります。

## ローカル実行

1. `npm install`
2. 初回のみ、personal stage に secret を設定する。

   ```bash
   npx sst secret set UmaOneDrawTopicDiscordWebhook <webhook-url> --config infra/sst.config.ts --stage <your-stage>
   npx sst secret set DatabaseUrl <pooled-database-url> --config infra/sst.config.ts --stage <your-stage>
   npx sst secret set YacchoDiscordBotToken <bot-token> --config infra/sst.config.ts --stage <your-stage>
   npx sst secret set R2Credentials '<r2-credentials-json>' --config infra/sst.config.ts --stage <your-stage>
   ```

   `R2Credentials` は media-sync と media-thumbnail と media-adopt を動かすときだけ必要です。

3. リポジトリルートで `npm run dev` を実行する。
4. 別ターミナルから personal stage の batch Lambda を起動する。

   ```bash
   aws lambda invoke --function-name <BatchFunction の関数名> \
     --cli-binary-format raw-in-base64-out \
     --payload '{"job":"uma-one-draw-topic"}' /dev/stdout
   ```
