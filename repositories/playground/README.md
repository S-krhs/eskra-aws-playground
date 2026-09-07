# Playground Repositories

## ガチャ候補

`playground.gacha_entities` は抽選対象の候補を pool 単位で持つ汎用テーブルです。

| column | 用途 |
| --- | --- |
| `pool_key` | 候補が属する pool(`shared/literals/gacha-pool-key.ts` の enum) |
| `name` | 候補名。`pool_key` との複合主キー |
| `rarity` | 候補のレアリティ(`shared/literals/gacha-rarity.ts` の enum) |

抽選の重みやメッセージ文面は含めません（feature 側の設定）。UMA ワンドロのお題は `pool_key = uma-one-draw-topic` を使います。

## Discord 設定

設定のスコープごとにテーブルを分け、`user_id` の null や Guild 全体を表す予約値は使いません。

- `playground.discord_guild_settings`: Guild 全体へ適用する設定
- `playground.discord_user_settings`: Guild 内の利用者ごとに適用する設定

どちらも `application_key` と `setting_key` で用途を識別し、用途固有の JSONB を `configuration` に保存します。新しい設定を足すときは `application_key`・`setting_key` の値を増やすだけで、migration は不要です。

遊技チェックリマインダーは `application_key = yaccho-bot`・`setting_key = play-check-reminder` を `discord_user_settings` に、`{ version: 1, channelId }` の configuration で持ちます（`ChannelSetting` repository）。
