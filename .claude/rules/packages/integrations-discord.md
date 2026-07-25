---
paths:
  - "packages/integrations/discord/**"
---

# Discord Integration

Discord API との通信境界です。outbound(こちらから Discord を呼ぶ)と inbound(Discord から届いた interaction リクエストの解釈)の両方向を担います。

## 公開 API

outbound クライアント(実通信):

- `discord-webhook-client.ts`(Webhook 送信)
- `discord-bot-client.ts`(Bot API への channel message 投稿)
- `discord-command-client.ts`(global / guild command の取得と bulk overwrite)
- `discord-interaction-client.ts`(deferred 応答済み interaction の元メッセージ編集と follow-up 投稿)

inbound protocol(通信を伴わない wire 処理・型):

- `parse-interaction.ts`(interaction リクエスト body を型付き interaction モデルへ parse する)
- `parse-interaction-callback.ts`(deferred 応答用の application_id・token を取り出す)
- `verify-interaction-signature.ts`(Ed25519 署名検証)
- `interaction-response.ts`(interaction callback の応答 payload 型・const)
- `discord-interaction.ts`(parse 済み interaction のモデル型)

## 方針

- Discord 固有の payload 型、HTTP 通信、署名検証、interaction の wire parse、失敗応答のエラー変換に集中する。
- **custom_id の規約(`prefix:target:action`)解釈は行わない。** `parse-interaction` は生の custom_id 文字列のまま返し、規約の解釈は呼び出し側(`shared-domains` の custom-id codec)へ委ねる。
- Webhook URL・token・public key の解決、業務文言の生成・判定、application 固有の command 名判定は行わない。
- `shared-domains` や `apps/*` を import しない(integration は最も内側の通信境界)。
- Webhook URL が Discord の HTTPS Webhook API を指すことを検証する。
- secret 値をログやエラーメッセージに含めない。失敗応答の本文に含まれる Webhook URL と interaction token は除去してからエラーに載せる。
- 外部 API 失敗は、呼び出し側が原因を区別できる error class(`DiscordWebhookError` など)に変換する。
- 実通信操作は認証情報と通信設定を保持する client class にまとめ、構築済み payload を受け取る。inbound の parse / 署名検証は依存を持たない純粋関数として提供する。
- HTTP 共通処理(`src/internal/` の fetch-json / send-json)は公開 API にしない。境界データを表す type / interface は入出力契約として export してよい。
