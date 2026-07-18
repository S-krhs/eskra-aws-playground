# CI/CD

このドキュメントは、GitHub Actions と SST deploy に必要な設定をまとめます。

## 対象 workflow

`.github/workflows/deploy.yml` は `main` ブランチへの push で実行します。

処理の流れ:

1. `npm ci`
2. reusable CI で `typecheck`・`lint`・`test`
3. AWS OIDC 認証
4. `npm run db:migrate`（DB migration。`DIRECT_DATABASE_URL` はこの step の env にだけ渡す）
5. `npm run deploy`
6. `sst shell --stage develop ... npm run discord:sync:run`（Bot ごとの global command を同期。SST secret を参照するため sst shell 経由。deploy 後に実行する）

`npm run typecheck` と `npm run lint` は Turbo 経由で workspace ごとに実行します。
`infra` も workspace として typecheck / lint の対象に含めます。
ただし `sst.config.ts` は SST が生成する `.sst/platform` の型に依存し CI には存在しないため、型検査は設定値を持つ `infra/config/` に限定します（lint は `sst.config.ts` も対象）。
`npm run deploy` は workspace の build を実行してから `sst deploy --stage develop --config infra/sst.config.ts` を実行します。

## デプロイ対象

SST は `infra/sst.config.ts` から次のリソースを管理します。

- Lambda function
- EventBridge Scheduler
- SQS Queue / DLQ
- 失敗検知用の SNS Topic と CloudWatch alarm（DLQ 滞留、Orchestrator エラー）
- browser runtime Lambda Layer と、その archive を置く S3 asset bucket
- Scheduler、SQS、SNS 連携に必要な IAM resource

各 app/job の Scheduler event payload と secret は、該当 app の README を参照します。

## GitHub Actions Secrets

必須:

- `AWS_REGION`
- `AWS_ROLE_ARN`
- `UMA_ONE_DRAW_TOPIC_DISCORD_WEBHOOK_URL`
- `ANIME_ANALYSIS_DISCORD_WEBHOOK_URL`
- `ALERT_DISCORD_WEBHOOK_URL`
- `DATABASE_URL`（develop 用 Neon branch の pooled 接続文字列。`SST_SECRET_DatabaseUrl` として DB を使う Lambda へ渡す）
- `DIRECT_DATABASE_URL`（develop 用 Neon branch の direct 接続文字列。migration step だけが使う）
- `YACCHO_DISCORD_BOT_TOKEN`
- `YACCHO_DISCORD_INTERACTION_PUBLIC_KEY`
- `YACCHO_DISCORD_APPLICATION_ID`
- `KAGUYA_DISCORD_BOT_TOKEN`
- `KAGUYA_DISCORD_INTERACTION_PUBLIC_KEY`
- `KAGUYA_DISCORD_APPLICATION_ID`

各 Bot の bot token・application ID は deploy step で Bot 名付きの `SST_SECRET_*` として SST secret に書き込み、同期 step は `sst shell` 経由で読みます。command は global scope へ同期するため Guild ID は不要です。

Webhook 系は deploy job で `SST_SECRET_*` env として SST secret に渡します。
app/job 固有の GitHub Actions Secrets は、該当 app の README を参照します。

アニメ分析 worker は、Playwright / Chromium 実行に必要な runtime 依存を `infra/layers/browser-runtime` から Lambda Layer として発行して参照します。
この Layer は deploy 前に `npm run build:browser-runtime-layer` で `.tmp/layers/browser-runtime` に作成します。
Layer archive は Lambda の direct upload 上限を避けるため、versioning を有効にした `sst-asset-*` S3 bucket に置いてから publish します。


## DB migration

CD は deploy の直前に `npm run db:migrate`（`prisma migrate deploy`）を常に実行します。適用されるのは commit 済みの `migration/migrations/` だけです。

- migration の作成・ルール・コマンドは [migration/README.md](../migration/README.md) を参照します。
- 破壊的 migration（column の drop / rename / 型変更）を含む PR は、その旨を PR 本文に明記しレビュー承認を必須とします。
- rollback は forward-only（打ち消し migration を新規作成）とします。

### Neon の手動セットアップ（記録）

Neon project の作成だけは console での手作業を許容し、内容をここに記録します。

- Neon project を AWS ap-southeast-1 に作成。
- default branch を develop 用として使い、ローカル用に child branch `local` を作成。
- 接続文字列 3 つを取得: develop の pooled（GitHub Secret `DATABASE_URL`）、develop の direct（GitHub Secret `DIRECT_DATABASE_URL`）、local の direct（手元の `.env`）。
- schema / table は console で作成しない。`CREATE SCHEMA` も含めてすべて Prisma migration で行う（console は読み取りのみ）。

## Discord スラッシュコマンドの同期

Yaccho Bot と Kaguya Bot のスラッシュコマンドは、それぞれの interaction route 配下にある `contracts/commands.ts` で定義し、CD の deploy 後に各 Discord application の global scope へ `PUT /applications/{application.id}/commands`（bulk overwrite）します。定義に無い global command は Discord 側から削除されるため、コードと登録コマンドが常に一致します。冪等なので毎 deploy 実行して問題ありません。

コマンドの追加・変更は `commands.ts` の編集だけで完結し、`main` への merge で自動反映されます。

同期スクリプトは各 Bot の bot token・application ID を SST secret（`Resource`）から読むため、`sst shell` 経由で起動します。secret を env で直接渡さないので、他の app と同じく stage ごとの SST secret が唯一の供給元になります。

- CD（develop stage）: deploy step が Bot ごとの値を `SST_SECRET_*` で SST secret に書き込み、同期 step が `sst shell --stage develop ... -- npm run discord:sync:run` で参照します。
- ローカル（personal stage）: 対象 stage に secret を設定したうえで `npm run discord:sync` を実行します（`sst shell` で personal stage の secret を注入して同期）。

確認用のサブコマンド:

- `npm run discord:sync:dry`: Discord に現在登録済みのコマンドを read-only で取得し、登録予定と並べて表示する（送信はしない。secret が要るため `sst shell` 経由）。

### Discord の手動セットアップ（記録）

Discord application は API で作成できないため、初回のみ Developer Portal での手作業を許容し、内容をここに記録します。

- [Discord Developer Portal](https://discord.com/developers/applications) で Yaccho Bot と Kaguya Bot の application を作成し、それぞれ Bot を追加する。
- 各 application の **Application ID**・**Public Key**（General Information）と Bot **Token**（Bot タブ）を控える。
- 各 Bot の OAuth2 URL Generator で scope に `bot` と `applications.commands` を付けた招待 URL を生成し、対象 guild へ招待する（`applications.commands` が無いとスラッシュコマンドが表示されない）。
- CD 用に Yaccho Bot の `YACCHO_DISCORD_BOT_TOKEN`・`YACCHO_DISCORD_APPLICATION_ID`・`YACCHO_DISCORD_INTERACTION_PUBLIC_KEY` と、Kaguya Bot の同等な `KAGUYA_DISCORD_*` 3 値を GitHub Secrets へ登録する。
- ローカルで同期する stage には `YacchoDiscordBotToken`・`YacchoDiscordApplicationId`・`YacchoDiscordInteractionPublicKey` と、対応する `KaguyaDiscord*` SST secret を直接設定する。
- 初回 deploy 後、出力された Function URL に Yaccho Bot は `/discord/interactions/yaccho-bot`、Kaguya Bot は `/discord/interactions/kaguya-bot` を付け、各 Portal の **Interactions Endpoint URL** に設定する。設定時に Discord が検証リクエストを送るため、エンドポイントが deploy 済みで動作している状態でのみ保存できる（この 1 回のみ手動、以降 URL は変わらない）。

### 利用者設定の direct cutover

`playground.discord_guild_settings` と `playground.discord_user_settings` の追加は expand-contract や旧 secret からの backfill を行いません。遊技チェックリマインダーは利用者単位の後者を使うため、migration・deploy・global command 同期の完了後、各利用者が投稿先チャンネルで `/gamble-check-enable` を実行して本人の設定を作成します。

## AWS 認証

GitHub Actions は `aws-actions/configure-aws-credentials` で OIDC 認証します。
`AWS_ROLE_ARN` には GitHub Actions から AssumeRole できる IAM role の ARN を設定します。

workflow 全体の `GITHUB_TOKEN` は `contents: read` に制限し、deploy job だけ `id-token: write` を追加します。

この role には、SST が develop stage のリソースを作成・更新するための権限が必要です。
初期構築中は広めの権限でデプロイを通し、作成されるリソースが固まってから絞り込む方針にします。

## GitHub Actions の Node.js runtime 警告

GitHub Actions で `Node.js xx is deprecated. The following actions target Node.js xx...` という警告が出た場合は、workflow の `node-version` ではなく、該当 action の major version を更新します。

例: `aws-actions/configure-aws-credentials@v3` が Node.js 20 deprecation 警告を出す場合、Node.js 24 対応済みの `aws-actions/configure-aws-credentials@v6` へ更新します。

注意点:

- `actions/setup-node` の `node-version` は、このリポジトリの npm scripts を実行する Node.js version です。
- `uses:` で指定する GitHub Actions 自体の実行 runtime は、各 action の実装に依存します。
- この警告は Lambda runtime や SST の runtime 指定を変えても解消しません。
- 再発時は、警告に出ている action 名を確認し、公式 release/changelog を見て最新の supported major に上げます。

## ローカルとの差分

ローカル実行は `npm run dev`（personal stage への `sst dev`）に統合しており、app 配下に `.env` は置きません。
secret は stage ごとに `npx sst secret set` で設定します。

ローカルで SST の構成確認をする場合:

```bash
npx sst diff --stage develop --config infra/sst.config.ts
```

このコマンドは AWS credentials が必要です。

## 変更時チェックリスト

- workflow の Node.js version と Lambda runtime が意図した範囲に収まっているか。
- workflow の default permissions が read-only で、OIDC は deploy job だけに付与されているか。
- workflow 内の `uses:` action が deprecated Node.js runtime を target していないか。
- 新しい必須 env を追加した場合、GitHub Secrets と該当 app の README を更新したか。
- 破壊的 migration（column の drop / rename / 型変更）を含む場合、PR 本文に明記したか。
- `DIRECT_DATABASE_URL` が migration step 以外に渡っていないか。
- Scheduler の event payload が該当 app の routing の job 名と一致し、secret 値を含んでいないか。
- `npm run validate` が通るか。
- `npx sst diff --stage develop --config infra/sst.config.ts` で意図しない差分が出ていないか。
