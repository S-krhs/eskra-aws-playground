# Discord Integration

Discord API への実通信境界を担当する integration package です。

## Public API

- `src/discord-webhook-client.ts`
  - `DiscordWebhookClient`: 検証済み Webhook URL へテキスト本文を POST するクライアント。
  - `DiscordWebhookError`: Webhook 連携で発生した失敗を表すエラー。
- `src/discord-bot-client.ts`
  - `DiscordBotClient`: 構築済み channel message payload を Bot API へ投稿するクライアント。
  - `DiscordBotError`: Bot API 連携で発生した失敗を表すエラー。
- `src/discord-command-client.ts`
  - `DiscordCommandClient`: application の global／guild command を取得し、bulk overwrite するクライアント。
  - `DiscordCommandError`: Command API 連携で発生した失敗を表すエラー。

## 責務

- Discord 固有の送信・command 登録 payload 型、HTTP 通信、失敗応答のエラー変換を扱う。
- 送信先が Discord の HTTPS Webhook API であることを検証する。
- 失敗応答の本文に含まれる Webhook URL を除去してからエラーに載せる。
- Webhook URL の解決、payload の構築、interaction の parse、ジョブ判定、業務文言や業務上の選択肢の生成・判定は扱わない。
