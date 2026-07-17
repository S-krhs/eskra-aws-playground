# Playground Repositories

playground 関連 app で共有する静的データと repository を置きます。

## data

`data.ts` は、UMA ワンドロのお題候補の静的カタログです。
どのお題がどのレアリティで出るかだけを表し、抽選の重みやメッセージ文面は含めません。

```json
{
  "rarity": "RARE",
  "name": "ダイワスカーレット"
}
```

- `rarity` は `types.ts` の `TOPIC_RARITIES` に含まれる値だけを使います。
- レアリティごとの抽選重みやメッセージテンプレートは、お題候補ではなく feature 側の設定として扱います。

## Discord 設定

設定のスコープごとにテーブルを分け、`user_id` の null や Guild 全体を表す予約値を使いません。

- `playground.discord_guild_settings`: Guild 全体へ適用する設定
- `playground.discord_user_settings`: Guild 内の利用者ごとに適用する設定

どちらも `application_key` と `setting_key` で用途を識別し、用途固有の JSONB を `configuration` に保存します。command 追加だけで migration を増やさず、汎用 repository が呼び出し側から受け取った Zod schema で保存前・読み出し時に検証します。

### Discord 利用者設定 repository

`discordUserSettingRepository` は `playground.discord_user_settings` を `application_key`・`setting_key`・`guild_id`・`user_id` で汎用的に扱い、特定用途に依存しません。用途固有の `application_key`・`setting_key`(`shared/literals` の enum)と `configuration` の Zod schema は呼び出し側が渡します。

- 遊技チェックリマインダーでは app 側の `reminderConfigStore` が `application_key = yaccho-bot`・`setting_key = play-check-reminder` と `{ version: 1, channelId }` schema を束ね、Guild 内の利用者ごとに独立した行を持ちます。
- 保存前と読み出し時に、渡された strict Zod schema で `configuration` を検証します。
- JSON schema が不正な行は無視せず読み出しを失敗させます。
