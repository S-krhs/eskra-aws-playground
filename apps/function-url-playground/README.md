# Function URL Playground

## route

| Bot | path | command |
| --- | --- | --- |
| Yaccho Bot | `/discord/interactions/yaccho-bot` | `/hello`, `/gamble-check-enable`, `/gamble-check-disable` |
| Kaguya Bot | `/discord/interactions/kaguya-bot` | `/inuihiroshi` |

別の Bot やサービスを追加する場合は、別パスと route を `src/handlers/handler.ts` の `routesByPath` に登録します。

## command 同期

```bash
npm run discord:sync        # 送信
npm run discord:sync:dry    # 送信せず、現登録と登録予定を表示
```

## Discord application のセットアップ

1. [Discord Developer Portal](https://discord.com/developers/applications) で Yaccho Bot と Kaguya Bot の application をそれぞれ作成する。
2. 各 application の Application ID、Bot token、General Information の Public Key を控える。
3. OAuth2 の `bot` と `applications.commands` scope で Bot を対象サーバーへ招待する。Yaccho Bot にはリマインダー投稿先で `Send Messages` 権限が必要。
4. デプロイ後、SST の出力 `functionUrl` に上表の path を付け、各 application の Interactions Endpoint URL に設定する。
5. `npm run discord:sync` で command を Bot ごとの global scope へ同期する。Guild ID の登録や同期は不要。

## 環境変数

| GitHub Actions secret | SST secret env | 用途 |
| --- | --- | --- |
| `YACCHO_DISCORD_INTERACTION_PUBLIC_KEY` | `SST_SECRET_YacchoDiscordInteractionPublicKey` | Lambda: 署名検証 |
| `KAGUYA_DISCORD_INTERACTION_PUBLIC_KEY` | `SST_SECRET_KaguyaDiscordInteractionPublicKey` | Lambda: 署名検証 |
| `YACCHO_DISCORD_BOT_TOKEN` | `SST_SECRET_YacchoDiscordBotToken` | command 同期 |
| `YACCHO_DISCORD_APPLICATION_ID` | `SST_SECRET_YacchoDiscordApplicationId` | command 同期 |
| `KAGUYA_DISCORD_BOT_TOKEN` | `SST_SECRET_KaguyaDiscordBotToken` | command 同期 |
| `KAGUYA_DISCORD_APPLICATION_ID` | `SST_SECRET_KaguyaDiscordApplicationId` | command 同期 |

## ローカル実行（sst dev）

ローカル起動の手順は `apps/batch-playground/README.md` の「ローカル実行」を参照。interaction / command 同期の secret は次で設定します。

```bash
npx sst secret set YacchoDiscordInteractionPublicKey <public-key> --config infra/sst.config.ts --stage <your-stage>
npx sst secret set YacchoDiscordApplicationId <application-id> --config infra/sst.config.ts --stage <your-stage>
npx sst secret set KaguyaDiscordBotToken <bot-token> --config infra/sst.config.ts --stage <your-stage>
npx sst secret set KaguyaDiscordInteractionPublicKey <public-key> --config infra/sst.config.ts --stage <your-stage>
npx sst secret set KaguyaDiscordApplicationId <application-id> --config infra/sst.config.ts --stage <your-stage>
```
