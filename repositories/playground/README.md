# Playground Repositories

playground 関連 app で共有するデータと repository を置きます。

## ガチャ候補

`playground.gacha_entities` は、抽選対象の候補を pool 単位で持つ汎用テーブルです。
どの候補がどのレアリティで出るかだけを表し、抽選の重みやメッセージ文面は含めません。

| column | 用途 |
| --- | --- |
| `pool_key` | 候補が属する pool(`shared/literals/gacha-pool-key.ts` の enum) |
| `name` | 候補名。`pool_key` との複合主キー |
| `rarity` | 候補のレアリティ |

### GachaEntity repository

`gachaEntityRepository` は `poolKey` を指定して候補一覧を返します。`rarity` は repository が所有する Zod schema で読み出し時に検証し、`GACHA_RARITIES` にない値の行は無視せず読み出しを失敗させます。

- UMA ワンドロのお題は `pool_key = uma-one-draw-topic` を使います。
- レアリティごとの抽選重みやメッセージテンプレートは、候補ではなく feature 側の設定として扱います。

## Discord 設定

設定のスコープごとにテーブルを分け、`user_id` の null や Guild 全体を表す予約値を使いません。

- `playground.discord_guild_settings`: Guild 全体へ適用する設定
- `playground.discord_user_settings`: Guild 内の利用者ごとに適用する設定

どちらも `application_key` と `setting_key` で用途を識別し、用途固有の JSONB を `configuration` に保存します。command 追加だけで migration を増やさず、configuration の形ごとに分けた repository が所有する Zod schema で保存前・読み出し時に検証します。

### ChannelSetting repository

`channelSettingRepository` は `playground.discord_user_settings` のうち、`{ version: 1, channelId }` を configuration に持つ設定を扱います。`application_key`・`setting_key`(`shared/literals` の enum)は呼び出し側が指定し、configuration の生成と検証は repository 内に閉じ込めます。

- 遊技チェックリマインダーでは job / operation が `application_key = yaccho-bot`・`setting_key = play-check-reminder` と `channelId` を repository へ渡し、Guild 内の利用者ごとに独立した行を持ちます。
- 保存前と読み出し時に、repository が所有する strict Zod schema で `configuration` を検証します。
- `save` は保存後の ChannelSetting、`deleteByGuildIdAndUserId` は削除した ChannelSetting を返します。削除対象がなければ `null` を返します。
- JSON schema が不正な行は無視せず読み出しを失敗させます。
