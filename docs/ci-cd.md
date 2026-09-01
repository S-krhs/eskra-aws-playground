# CI/CD

このドキュメントは、GitHub Actions と SST deploy の人間向け運用マニュアルです。
インフラ・workflow を変更するときの実装ルールとチェックリストは `.claude/rules/infra-deploy.md` を参照します。

## 対象 workflow

`.github/workflows/deploy.yml` は `main` ブランチへの push で実行します。
`.github/workflows/backfill-anime-bigquery.yml` は手動実行（`workflow_dispatch`）で、過去分のアニメ指標を BigQuery へ連携します。

処理の流れ:

1. `npm ci`
2. reusable CI で `typecheck`・`lint`・`test`
3. AWS OIDC 認証
4. `npm run db:migrate`（DB migration。`DIRECT_DATABASE_URL` はこの step の env にだけ渡す）
5. `npm run deploy`（workspace の build 後に `sst deploy --stage develop`）
6. `sst shell --stage develop ... npm run discord:sync:run`（Bot ごとの global command を同期。deploy 後に実行する）

SST が管理するリソースの一覧は `.claude/rules/infra-deploy.md` と `infra/sst.config.ts` を参照します。

## GitHub Actions Secrets

必須:

- `AWS_REGION`
- `AWS_ROLE_ARN`
- `UMA_ONE_DRAW_TOPIC_DISCORD_WEBHOOK_URL`
- `ANIME_ANALYSIS_DISCORD_WEBHOOK_URL`
- `ALERT_DISCORD_WEBHOOK_URL`
- `DATABASE_URL`（develop 用 Neon branch の pooled 接続文字列。`SST_SECRET_DatabaseUrl` として DB を使う Lambda へ渡す）
- `DIRECT_DATABASE_URL`（develop 用 Neon branch の direct 接続文字列。migration step だけが使う）
- `GCP_SERVICE_ACCOUNT_KEY`（BigQuery へ書き込む GCP サービスアカウント鍵の JSON。`SST_SECRET_GcpServiceAccountKey` として BigQuery 連携 Lambda へ渡す）
- `YACCHO_DISCORD_BOT_TOKEN`
- `YACCHO_DISCORD_INTERACTION_PUBLIC_KEY`
- `YACCHO_DISCORD_APPLICATION_ID`
- `KAGUYA_DISCORD_BOT_TOKEN`
- `KAGUYA_DISCORD_INTERACTION_PUBLIC_KEY`
- `KAGUYA_DISCORD_APPLICATION_ID`

これらは deploy job が `SST_SECRET_*` env として SST secret に書き込みます。command は global scope へ同期するため Guild ID は不要です。
app/job 固有の GitHub Actions Secrets は、該当 app の README を参照します。

アニメ分析 worker が参照する browser runtime Lambda Layer は、deploy 前に `npm run build:browser-runtime-layer` で `.tmp/layers/browser-runtime` に作成します。

## 過去分の BigQuery 連携

`Backfill anime metrics to BigQuery` workflow に取得日の開始・終了を渡すと、`scripts/backfill-anime-bigquery.js` が暦月ごとに区切って連携 Lambda を順に invoke します。取得日ごとにパーティションを置き換えるため、同じ期間を何度実行しても結果は変わりません。

deploy 用の OIDC role に、連携 Lambda への `lambda:GetFunction` と `lambda:InvokeFunction` が必要です。手順と注意点は [batch-anime-analysis の README](../apps/batch-anime-analysis/README.md) を参照します。

## DB migration

CD は deploy の直前に `npm run db:migrate`（`prisma migrate deploy`）を常に実行します。適用されるのは commit 済みの `migration/migrations/` だけです。
migration の作成・ルール・コマンドは [migration/README.md](../migration/README.md) を参照します。

### BigQuery の手動セットアップ（記録）

GCP は SST の管理外のため、初回のみ console / gcloud での手作業を許容し、内容を [batch-anime-analysis の README](../apps/batch-anime-analysis/README.md) に記録します。
dataset だけを手で作り、テーブルは連携 Lambda が作成します。

### Neon の手動セットアップ（記録）

Neon project の作成だけは console での手作業を許容し、内容をここに記録します。

- Neon project を AWS ap-southeast-1 に作成。
- default branch を develop 用として使い、ローカル用に child branch `local` を作成。
- 接続文字列 3 つを取得: develop の pooled（GitHub Secret `DATABASE_URL`）、develop の direct（GitHub Secret `DIRECT_DATABASE_URL`）、local の direct（手元の `.env`）。
- schema / table は console で作成しない。`CREATE SCHEMA` も含めてすべて Prisma migration で行う（console は読み取りのみ）。

## Discord スラッシュコマンドの同期

Yaccho Bot と Kaguya Bot のスラッシュコマンドは、それぞれの interaction route 配下にある `contracts/commands.ts` で定義し、CD の deploy 後に各 Discord application の global scope へ bulk overwrite します。定義に無い global command は Discord 側から削除されるため、コードと登録コマンドが常に一致します。冪等なので毎 deploy 実行して問題ありません。

コマンドの追加・変更は `commands.ts` の編集だけで完結し、`main` への merge で自動反映されます。
同期スクリプトは Bot の secret を SST secret から読むため、`sst shell` 経由で起動します。

- CD（develop stage）: deploy 後の同期 step が `sst shell --stage develop ... -- npm run discord:sync:run` で実行します。
- ローカル（personal stage）: 対象 stage に secret を設定したうえで `npm run discord:sync` を実行します。
- `npm run discord:sync:dry`: 登録済みコマンドを read-only で取得し、登録予定と並べて表示します（送信はしない）。

### Discord の手動セットアップ（記録）

Discord application は API で作成できないため、初回のみ Developer Portal での手作業を許容し、内容をここに記録します。

- [Discord Developer Portal](https://discord.com/developers/applications) で Yaccho Bot と Kaguya Bot の application を作成し、それぞれ Bot を追加する。
- 各 application の **Application ID**・**Public Key**（General Information）と Bot **Token**（Bot タブ）を控える。
- 各 Bot の OAuth2 URL Generator で scope に `bot` と `applications.commands` を付けた招待 URL を生成し、対象 guild へ招待する（`applications.commands` が無いとスラッシュコマンドが表示されない）。
- CD 用に Yaccho Bot の `YACCHO_DISCORD_*` 3 値と Kaguya Bot の `KAGUYA_DISCORD_*` 3 値を GitHub Secrets へ登録する。
- ローカルで同期する stage には `YacchoDiscord*`・`KaguyaDiscord*` の SST secret を直接設定する。
- 初回 deploy 後、出力された Function URL に Yaccho Bot は `/discord/interactions/yaccho-bot`、Kaguya Bot は `/discord/interactions/kaguya-bot` を付け、各 Portal の **Interactions Endpoint URL** に設定する。設定時に Discord が検証リクエストを送るため、エンドポイントが deploy 済みで動作している状態でのみ保存できる（この 1 回のみ手動、以降 URL は変わらない）。

### 利用者設定の direct cutover（完了済みの記録）

`playground.discord_guild_settings` と `playground.discord_user_settings` の追加は expand-contract や旧 secret からの backfill を行いませんでした。遊技チェックリマインダーは利用者単位の後者を使うため、migration・deploy・global command 同期の完了後、各利用者が投稿先チャンネルで `/gamble-check-enable` を実行して本人の設定を作成します。

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

ローカルで SST の構成確認をする場合（AWS credentials が必要）:

```bash
npx sst diff --stage develop --config infra/sst.config.ts
```

develop stage は CD 専用です。ローカルからの変更を 2 段で拒否します。

- `run()` 冒頭のガード: `run()` を評価するコマンドのうち `diff` 以外（`deploy`・`dev`・`refresh`）をエラーにする。
- `app()` の `protect`: `run()` を評価しない `sst remove --stage develop` を CLI レベルで拒否する。

ただし `sst secret set` / `sst secret list` はどちらも経由しないため、`--stage develop` を付けるとローカルからでも通ってしまいます。develop の secret は CD（GitHub Secrets 経由）でのみ設定し、ローカルから develop stage の secret を操作しないでください。

### ローカル検証の初回セットアップ

`npm run dev` は personal stage に SQS や secret などの実リソースを作成し、Lambda handler はローカルで実行します。定期起動の Scheduler（cron）は `sst dev` では作成されないため、cron が自動発火することはありません。

ただし one-time schedule の登録先（ScheduleGroup・IAM role・`scheduler:CreateSchedule` 権限）は `sst dev` でも作成されます。そのため `uma-one-draw-topic-scheduler` のように job 自身が one-time schedule を登録するジョブを手動起動すると、登録された schedule はセッション終了後の実時刻に発火し、スタブ Lambda を叩いて失敗（アラート通知）します。dev セッション後は `npx sst remove --config infra/sst.config.ts` で personal stage を破棄し、残った one-time schedule を消してください。

初回のみ次のセットアップが必要です。

1. SST がリソースを作成できる AWS credentials を用意する。
2. DB migration を local 用 Neon branch へ適用する。root `.env` に local branch の direct 接続文字列を `DIRECT_DATABASE_URL` として置き、`npm run db:migrate` を実行する。
3. personal stage に SST secret を登録する（`--stage` 省略時は personal stage）。`DatabaseUrl` には local branch の pooled 接続文字列を設定する。Webhook 系に本番と同じ URL を設定すると実送信が起きる点に注意する。

   ```bash
   npx sst secret set DatabaseUrl <local branch の pooled 接続文字列> --config infra/sst.config.ts
   npx sst secret set UmaOneDrawTopicDiscordWebhook <値> --config infra/sst.config.ts
   npx sst secret set AnimeAnalysisDiscordWebhook <値> --config infra/sst.config.ts
   npx sst secret set AlertDiscordWebhook <値> --config infra/sst.config.ts
   npx sst secret set YacchoDiscordBotToken <値> --config infra/sst.config.ts
   npx sst secret set YacchoDiscordInteractionPublicKey <値> --config infra/sst.config.ts
   npx sst secret set YacchoDiscordApplicationId <値> --config infra/sst.config.ts
   npx sst secret set KaguyaDiscordBotToken <値> --config infra/sst.config.ts
   npx sst secret set KaguyaDiscordInteractionPublicKey <値> --config infra/sst.config.ts
   npx sst secret set KaguyaDiscordApplicationId <値> --config infra/sst.config.ts
   ```

   登録状況の確認:

   ```bash
   npx sst secret list --config infra/sst.config.ts
   ```

4. `npm run dev` を実行する。
5. personal stage のリソースごと破棄する場合は `npx sst remove --config infra/sst.config.ts` を実行する。
