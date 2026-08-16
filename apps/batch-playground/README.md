# Batch Playground

Lambda イベントの `job` に応じてバッチジョブを実行する app です。

## 実行できるジョブ

### `uma-one-draw-topic`

UMA ワンドロのお題を生成し、Discord Webhook へ通知します。

```json
{
  "job": "uma-one-draw-topic"
}
```

- `job` は必須です。
- Discord Webhook URL はイベントに含めず、SST linked secret から解決します。
- お題候補は `playground.gacha_entities` の `pool_key = uma-one-draw-topic` から読み出します。

### `uma-one-draw-topic-scheduler`

当日 JST 12:00-18:00 のランダムな時刻に `uma-one-draw-topic` を起動する one-time schedule を EventBridge Scheduler へ登録します。schedule は実行後に自動削除されます。

```json
{
  "job": "uma-one-draw-topic-scheduler"
}
```

- schedule group 名と role ARN は SST が設定する環境変数から解決します。
- 起動対象 Lambda の ARN は Lambda context から解決します。
- 当日分が登録済みの場合は二重登録せず正常終了します。ただし発火後は schedule が自動削除されるため、その後に再実行すると再登録され通知が重複します。
- cron は JST 00:00 起動のため、それ以降にデプロイや障害で当日分が未登録の日は、JST 18:00 より前に `{"job": "uma-one-draw-topic-scheduler"}` で Lambda を手動起動すると残り window 内で当日分を登録できます(18:00 以降はエラーになります)。

### `play-check-reminder`

「今日は遊技をしましたか？」のリマインダーを、対象ユーザーへのメンションと「はい（勝った）」「はい（負けた）」「いいえ」の選択ボタン付きで Discord チャンネルへ Bot として投稿します。毎日 JST 22:00 に schedule 起動します。

```json
{
  "job": "play-check-reminder"
}
```

- Yaccho Bot の token は SST linked secret、対象ユーザー ID と投稿先チャンネル ID は `playground.discord_user_settings` の `user_id` と JSONB `configuration` から解決します。
- `/gamble-check-enable` を投稿先チャンネルで実行すると、実行者本人の設定を登録・更新します(コマンドの受け口は `function-url-playground`)。
- `/gamble-check-disable` は、同じ Guild にある実行者本人の設定だけを削除します。
- 登録済みの全ユーザーへ投稿し、一部で失敗しても他ユーザーへの投稿を試行してからジョブ全体を失敗させます。
- メッセージは全員に見えますが、ボタンの選択は custom_id に埋め込んだ対象ユーザーのみ受け付けます。

## Interaction の後追い処理（sqs-worker）

`src/handlers/sqs-worker/handler.ts` は、`function-url-playground` が deferred ACK した Discord interaction の後追いジョブを SQS 経由で受け取り、確定メッセージを生成して interaction token で元メッセージを差し替える worker です。

- DB 接続や Discord API 送信はこの worker 側で行います。応答先は message が持つ `application_id` と `token` から解決し、Bot token は使いません。
- interaction token は発行から 15 分有効です。後追いジョブは message 単位で最大 3 回まで再試行し、使い切ると DLQ へ送られ CloudWatch alarm から Discord へ通知されます。
- interaction の受け口（Function URL・署名検証・deferred 応答・command 同期）は `apps/function-url-playground` を参照してください。

## 環境変数

デプロイ時に GitHub Actions secret から SST secret として渡します（secret はスタックで共有し、`infra/sst.config.ts` が各 Lambda へ link します）。この app の Lambda が使うもの:

| GitHub Actions secret | SST secret env | 用途 |
| --- | --- | --- |
| `UMA_ONE_DRAW_TOPIC_DISCORD_WEBHOOK_URL` | `SST_SECRET_UmaOneDrawTopicDiscordWebhook` | batch: お題通知 |
| `YACCHO_DISCORD_BOT_TOKEN` | `SST_SECRET_YacchoDiscordBotToken` | batch: リマインダー投稿 |
| `DATABASE_URL` | `SST_SECRET_DatabaseUrl` | batch / sqs-worker: DB 接続 |

Discord interaction / command 同期用の secret は `apps/function-url-playground/README.md` を参照してください。

デプロイ時に SST(`infra/sst.config.ts`)が batch Lambda へ設定する環境変数:

- `UMA_ONE_DRAW_TOPIC_SCHEDULE_GROUP_NAME`
- `UMA_ONE_DRAW_TOPIC_SCHEDULER_ROLE_ARN`

## ローカル実行（sst dev）

ローカル実行は `sst dev` の Live Lambda に統合しています（スタック全体で共通。`.env` は使いません）。

1. `npm install`
2. 初回のみ、personal stage に secret を設定します。

   ```bash
   npx sst secret set UmaOneDrawTopicDiscordWebhook <webhook-url> --config infra/sst.config.ts --stage <your-stage>
   npx sst secret set DatabaseUrl <pooled-database-url> --config infra/sst.config.ts --stage <your-stage>
   npx sst secret set YacchoDiscordBotToken <bot-token> --config infra/sst.config.ts --stage <your-stage>
   ```

   Discord interaction / command 同期の secret は `apps/function-url-playground/README.md` を参照してください。

3. リポジトリルートで `npm run dev` を実行します。
4. 別ターミナルから personal stage の batch Lambda を起動すると、handler は手元のプロセスで実行されます。

   ```bash
   aws lambda invoke --function-name <BatchFunction の関数名> \
     --cli-binary-format raw-in-base64-out \
     --payload '{"job":"uma-one-draw-topic"}' /dev/stdout
   ```

### リマインダー設定

今回の migration は expand-contract や旧 secret からの backfill を行いません。デプロイ後、利用者本人が投稿先チャンネルで `/gamble-check-enable` を実行してください（コマンドの受け口は `function-url-playground`）。
