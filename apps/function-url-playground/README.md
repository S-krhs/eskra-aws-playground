# Function URL Playground

Discord interaction を受ける Lambda Function URL の公開エンドポイント app です。`src/handlers/handler.ts` がリクエストパス（`rawPath`）で Bot ごとの route を振り分けます。確定応答は作らず deferred で ACK し、実処理は SQS 経由で `batch-playground` の sqs-worker へ渡します（この app は DB に接続しません）。

## route

| Bot | path | command |
| --- | --- | --- |
| Yaccho Bot | `/discord/interactions/yaccho-bot` | `/hello`, `/gamble-check-enable`, `/gamble-check-disable` |
| Kaguya Bot | `/discord/interactions/kaguya-bot` | `/inuihiroshi` |

別の Bot やサービス（例: Slack）を追加する場合は、別パスと route を `handler.ts` の `routesByPath` に登録します。

- 対応しないパスは 404 を返します。
- リクエストは Discord application の public key で Ed25519 署名を検証します（不正は 401）。
- Discord の Endpoint 検証（PING）には PONG を返します。

## 応答の流れ（deferred + 後追いジョブ）

Discord interaction は 3 秒以内に応答しないと失敗するため、確定応答を作らず deferred で ACK し、実処理は SQS の後追いジョブへ渡します。確定メッセージの生成と Discord API 送信は `batch-playground` の sqs-worker 側で行い、worker が interaction token で元メッセージを差し替えます。

| interaction | 即時応答 | 後追いジョブの結果 |
| --- | --- | --- |
| `/hello`, `/inuihiroshi` | deferred message（type 5・公開） | 元メッセージを固定文へ差し替え |
| `/gamble-check-enable`, `/gamble-check-disable` | deferred message（type 5 + flags 64） | 設定を登録・削除し結果文へ差し替え |
| 対象ユーザーのボタン押下 | deferred update（type 6） | 元メッセージを選択結果へ差し替えボタンを取り除く |
| 対象外ユーザーのボタン押下 | ephemeral メッセージ（type 4 + flags 64） | なし（enqueue しない） |
| サーバー外での gamble-check 実行 | ephemeral メッセージ（type 4 + flags 64） | なし（enqueue しない） |
| PING・autocomplete | PONG（type 1）・空の候補一覧（type 8） | なし（deferred type が存在しないため即時確定） |

- interaction token は発行から 15 分有効です。後追いジョブは message 単位で最大 3 回まで再試行し、使い切ると DLQ へ送られ CloudWatch alarm から Discord へ通知されます。
- Discord の parse・署名検証・応答型は `@eskra-aws-playground/integration-discord`、custom_id 規約・interaction ジョブ契約は `@eskra-aws-playground/shared-domains` を使います。

## command 同期

スラッシュコマンドは各 route の `contracts/commands.ts` に宣言し、deploy 後に global scope へ bulk overwrite で同期します。

```bash
npm run discord:sync        # 送信
npm run discord:sync:dry    # 送信せず、現登録と登録予定を表示
```

## Discord application のセットアップ

1. [Discord Developer Portal](https://discord.com/developers/applications) で Yaccho Bot と Kaguya Bot の application をそれぞれ作成します。
2. 各 application の Application ID、Bot token、General Information の Public Key を控えます。
3. OAuth2 の `bot` と `applications.commands` scope で Bot を対象サーバーへ招待します。Yaccho Bot にはリマインダー投稿先で `Send Messages` 権限が必要です。
4. デプロイ後、SST の出力 `functionUrl` に上表の path を付け、各 application の Interactions Endpoint URL に設定します。
5. command は Bot ごとの global scope へ `npm run discord:sync` で同期します。Guild ID の登録や同期は不要です。

## 環境変数

デプロイ時に GitHub Actions secret から SST secret として渡します（secret はスタックで共有）。

| GitHub Actions secret | SST secret env | 用途 |
| --- | --- | --- |
| `YACCHO_DISCORD_INTERACTION_PUBLIC_KEY` | `SST_SECRET_YacchoDiscordInteractionPublicKey` | Lambda: 署名検証 |
| `KAGUYA_DISCORD_INTERACTION_PUBLIC_KEY` | `SST_SECRET_KaguyaDiscordInteractionPublicKey` | Lambda: 署名検証 |
| `YACCHO_DISCORD_BOT_TOKEN` | `SST_SECRET_YacchoDiscordBotToken` | command 同期 |
| `YACCHO_DISCORD_APPLICATION_ID` | `SST_SECRET_YacchoDiscordApplicationId` | command 同期 |
| `KAGUYA_DISCORD_BOT_TOKEN` | `SST_SECRET_KaguyaDiscordBotToken` | command 同期 |
| `KAGUYA_DISCORD_APPLICATION_ID` | `SST_SECRET_KaguyaDiscordApplicationId` | command 同期 |

deferred 応答済み interaction を渡す SQS Queue（`PlaygroundInteractionQueue`）は `infra/sst.config.ts` が link します。

## ローカル実行（sst dev）

スタック全体の `sst dev` に統合しています。ローカル起動の手順は `apps/batch-playground/README.md` の「ローカル実行」を参照してください。interaction / command 同期に必要な secret は上の環境変数表の SST secret 名を使い、次で設定します。

```bash
npx sst secret set YacchoDiscordInteractionPublicKey <public-key> --config infra/sst.config.ts --stage <your-stage>
npx sst secret set YacchoDiscordApplicationId <application-id> --config infra/sst.config.ts --stage <your-stage>
npx sst secret set KaguyaDiscordBotToken <bot-token> --config infra/sst.config.ts --stage <your-stage>
npx sst secret set KaguyaDiscordInteractionPublicKey <public-key> --config infra/sst.config.ts --stage <your-stage>
npx sst secret set KaguyaDiscordApplicationId <application-id> --config infra/sst.config.ts --stage <your-stage>
```
