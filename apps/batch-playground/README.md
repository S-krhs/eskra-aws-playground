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

- Yaccho Bot の token は SST linked secret、対象ユーザー ID と投稿先チャンネル ID は `playground.discord_user_settings` の `user_id` と JSONB `configuration` から解決します。
- `/gamble-check-enable` を投稿先チャンネルで実行すると、実行者本人の設定を登録・更新します。
- `/gamble-check-disable` は、同じ Guild にある実行者本人の設定だけを削除します。
- 登録済みの全ユーザーへ投稿し、一部で失敗しても他ユーザーへの投稿を試行してからジョブ全体を失敗させます。
- メッセージは全員に見えますが、ボタンの選択は custom_id に埋め込んだ対象ユーザーのみ受け付けます。

## Discord interaction handler

`src/handlers/function-url/handler.ts` は、HTTP リクエストを受ける Lambda Function URL の公開エンドポイントです。リクエストパス（`rawPath`）で Bot ごとの route を振り分けます。

| Bot | path | command |
| --- | --- | --- |
| Yaccho Bot | `/discord/interactions/yaccho-bot` | `/hello`, `/gamble-check-enable`, `/gamble-check-disable` |
| Kaguya Bot | `/discord/interactions/kaguya-bot` | `/inuihiroshi` |

別の Bot やサービス（例: Slack）を追加する場合は、別パスと route を `handler.ts` の `routesByPath` に登録します。

- 対応しないパスは 404 を返します。
- リクエストは Discord application の public key で Ed25519 署名を検証します（不正は 401）。
- 対象ユーザーの押下: 元メッセージを選択結果の表示へ更新し、ボタンを取り除きます（type 7）。
- 対象外ユーザーの押下: 本人にだけ見える ephemeral メッセージで対象外である旨を返します（type 4 + flags 64）。
- Discord の Endpoint 検証（PING）には PONG を返します。

### Discord application のセットアップ

1. [Discord Developer Portal](https://discord.com/developers/applications) で Yaccho Bot と Kaguya Bot の application をそれぞれ作成します。
2. 各 application の Application ID、Bot token、General Information の Public Key を控えます。
3. OAuth2 の `bot` と `applications.commands` scope で Bot を対象サーバーへ招待します。Yaccho Bot にはリマインダー投稿先で `Send Messages` 権限が必要です。
4. デプロイ後、SST の出力 `functionUrl` に上表の path を付け、各 application の Interactions Endpoint URL に設定します。
5. command は Bot ごとの global scope へデプロイ後に自動同期されます。Guild ID の登録や同期は不要です。

## 環境変数

デプロイ時に GitHub Actions secret から SST secret として渡します。

- GitHub Actions secret: `UMA_ONE_DRAW_TOPIC_DISCORD_WEBHOOK_URL`
- SST secret env: `SST_SECRET_UmaOneDrawTopicDiscordWebhook`

Discord Bot 用に以下も同様に渡します。

| GitHub Actions secret | SST secret env |
| --- | --- |
| `YACCHO_DISCORD_BOT_TOKEN` | `SST_SECRET_YacchoDiscordBotToken` |
| `YACCHO_DISCORD_INTERACTION_PUBLIC_KEY` | `SST_SECRET_YacchoDiscordInteractionPublicKey` |
| `YACCHO_DISCORD_APPLICATION_ID` | `SST_SECRET_YacchoDiscordApplicationId` |
| `KAGUYA_DISCORD_BOT_TOKEN` | `SST_SECRET_KaguyaDiscordBotToken` |
| `KAGUYA_DISCORD_INTERACTION_PUBLIC_KEY` | `SST_SECRET_KaguyaDiscordInteractionPublicKey` |
| `KAGUYA_DISCORD_APPLICATION_ID` | `SST_SECRET_KaguyaDiscordApplicationId` |
| `DATABASE_URL` | `SST_SECRET_DatabaseUrl` |

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

   Discord interaction と command 同期を使う場合は以下も設定します。

   ```bash
   npx sst secret set DatabaseUrl <pooled-database-url> --config infra/sst.config.ts --stage <your-stage>
   npx sst secret set YacchoDiscordBotToken <bot-token> --config infra/sst.config.ts --stage <your-stage>
   npx sst secret set YacchoDiscordInteractionPublicKey <public-key> --config infra/sst.config.ts --stage <your-stage>
   npx sst secret set YacchoDiscordApplicationId <application-id> --config infra/sst.config.ts --stage <your-stage>
   npx sst secret set KaguyaDiscordBotToken <bot-token> --config infra/sst.config.ts --stage <your-stage>
   npx sst secret set KaguyaDiscordInteractionPublicKey <public-key> --config infra/sst.config.ts --stage <your-stage>
   npx sst secret set KaguyaDiscordApplicationId <application-id> --config infra/sst.config.ts --stage <your-stage>
   ```

3. リポジトリルートで `npm run dev` を実行します。
4. 別ターミナルから personal stage の batch Lambda を起動すると、handler は手元のプロセスで実行されます。

   ```bash
   aws lambda invoke --function-name <BatchFunction の関数名> \
     --cli-binary-format raw-in-base64-out \
     --payload '{"job":"uma-one-draw-topic"}' /dev/stdout
   ```

### リマインダー設定と旧 guild command の移行

今回の migration は expand-contract や旧 secret からの backfill を行いません。デプロイ後、利用者本人が投稿先チャンネルで `/gamble-check-enable` を実行してください。

以前の Yaccho Bot guild command が残っている Guild は、一回だけ次を実行して削除します。

```bash
npm run discord:yaccho:guild-commands:clear -- <guild-id>
```

## ドキュメント

- アーキテクチャ: [docs/architecture.md](docs/architecture.md)
- 実装ルール: [docs/implementation-rules.md](docs/implementation-rules.md)
