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

- Bot token・投稿先チャンネル ID・対象ユーザー ID は SST linked secret から解決します。
- メッセージは全員に見えますが、ボタンの選択は custom_id に埋め込んだ対象ユーザーのみ受け付けます。

## Discord interaction handler

`src/handlers/function-url/handler.ts` は、HTTP リクエストを受ける Lambda Function URL の公開エンドポイントです。リクエストパス（`rawPath`）で担当 job を振り分けます。現状は `/discord/interactions`（リマインダーのボタン押下＝Discord interaction）のみを登録しています。別サービス（例: Slack）を追加する場合は、別パスと job を `handler.ts` の `jobsByPath` に登録します。

- 対応しないパスは 404 を返します。
- リクエストは Discord application の public key で Ed25519 署名を検証します（不正は 401）。
- 対象ユーザーの押下: 元メッセージを選択結果の表示へ更新し、ボタンを取り除きます（type 7）。
- 対象外ユーザーの押下: 本人にだけ見える ephemeral メッセージで対象外である旨を返します（type 4 + flags 64）。
- Discord の Endpoint 検証（PING）には PONG を返します。

### Discord application のセットアップ

1. [Discord Developer Portal](https://discord.com/developers/applications) で application を作成します。
2. Bot の token（`DiscordBotToken`）と General Information の Public Key（`DiscordInteractionPublicKey`）を控えます。
3. Bot を対象サーバーへ招待します（`Send Messages` 権限が必要）。
4. デプロイ後、SST の出力 `functionUrl`（公開エンドポイント Lambda の Function URL）に `discord/interactions` パスを付けた URL を application の Interactions Endpoint URL に設定します。

## 環境変数

デプロイ時に GitHub Actions secret から SST secret として渡します。

- GitHub Actions secret: `UMA_ONE_DRAW_TOPIC_DISCORD_WEBHOOK_URL`
- SST secret env: `SST_SECRET_UmaOneDrawTopicDiscordWebhook`

遊技チェックリマインダー用に以下も同様に渡します。

| GitHub Actions secret | SST secret env |
| --- | --- |
| `DISCORD_BOT_TOKEN` | `SST_SECRET_DiscordBotToken` |
| `DISCORD_INTERACTION_PUBLIC_KEY` | `SST_SECRET_DiscordInteractionPublicKey` |
| `PLAY_CHECK_REMINDER_DISCORD_CHANNEL_ID` | `SST_SECRET_PlayCheckReminderDiscordChannelId` |
| `PLAY_CHECK_REMINDER_TARGET_USER_ID` | `SST_SECRET_PlayCheckReminderTargetUserId` |

デプロイ時に SST(`infra/sst.config.ts`)が Lambda へ設定します。

- `UMA_ONE_DRAW_TOPIC_SCHEDULE_GROUP_NAME`
- `UMA_ONE_DRAW_TOPIC_SCHEDULER_ROLE_ARN`

## ローカル実行（sst dev）

ローカル実行は `sst dev` の Live Lambda に統合しています。`.env` は使いません。

1. `npm install`
2. 初回のみ、personal stage に secret を設定します。

   ```bash
   npx sst secret set UmaOneDrawTopicDiscordWebhook <webhook-url> --config infra/sst.config.ts --stage <your-stage>
   ```

   遊技チェックリマインダーを動かす場合は以下も設定します。

   ```bash
   npx sst secret set DiscordBotToken <bot-token> --config infra/sst.config.ts --stage <your-stage>
   npx sst secret set DiscordInteractionPublicKey <public-key> --config infra/sst.config.ts --stage <your-stage>
   npx sst secret set PlayCheckReminderDiscordChannelId <channel-id> --config infra/sst.config.ts --stage <your-stage>
   npx sst secret set PlayCheckReminderTargetUserId <user-id> --config infra/sst.config.ts --stage <your-stage>
   ```

3. リポジトリルートで `npm run dev` を実行します。
4. 別ターミナルから personal stage の batch Lambda を起動すると、handler は手元のプロセスで実行されます。

   ```bash
   aws lambda invoke --function-name <BatchFunction の関数名> \
     --cli-binary-format raw-in-base64-out \
     --payload '{"job":"uma-one-draw-topic"}' /dev/stdout
   ```

## ドキュメント

- アーキテクチャ: [docs/architecture.md](docs/architecture.md)
- 実装ルール: [docs/implementation-rules.md](docs/implementation-rules.md)
