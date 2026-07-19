---
paths:
  - "packages/integrations/discord/**"
---

# Discord Integration

Discord API への実通信境界です。公開 API は `discord-webhook-client.ts`(Webhook 送信)、`discord-bot-client.ts`(Bot API への channel message 投稿)、`discord-command-client.ts`(global / guild command の取得と bulk overwrite)の 3 クライアントに限定します。

- Discord 固有の送信・command 登録 payload 型、HTTP 通信、失敗応答のエラー変換に集中する。Webhook URL や token の解決、payload の構築、interaction の parse、業務文言の生成・判定は行わない。
- Webhook URL が Discord の HTTPS Webhook API を指すことを検証する。
- secret 値をログやエラーメッセージに含めない。失敗応答の本文に含まれる Webhook URL は除去してからエラーに載せる。
- 外部 API 失敗は、呼び出し側が原因を区別できる error class(`DiscordWebhookError` など)に変換する。
- 実通信操作は、認証情報と通信設定を保持する client class にまとめる。client は構築済み payload を受け取り、protocol 固有の Parse / Build は行わない。
- HTTP 共通処理(`src/internal/` の fetch-json / send-json)は公開 API にしない。境界データを表す type / interface は client の入出力契約として export してよい。
