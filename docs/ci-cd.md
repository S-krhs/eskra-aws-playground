# CI/CD

## 対象 workflow

- `.github/workflows/deploy.yml`: `main` への push で実行。
- `.github/workflows/backfill-anime-bigquery.yml`: 手動実行（`workflow_dispatch`）。過去分のアニメ指標を BigQuery へ連携する。

deploy の流れ:

1. `npm ci`
2. `typecheck` → `lint` → `test`
3. AWS OIDC 認証
4. `npm run db:migrate`（`DIRECT_DATABASE_URL` はこの step の env にだけ渡す）
5. `npm run deploy`（`sst deploy --stage develop`）
6. `sst shell --stage develop ... npm run discord:sync:run`

## Lambda Layer のビルド

`sst deploy` / `sst dev` / `sst diff` はどれも `.tmp/layers/` 配下の成果物を読む。

```bash
npm run build:browser-runtime-layer   # .tmp/layers/browser-runtime
npm run build:ffmpeg-layer            # .tmp/layers/ffmpeg
```

`npm run deploy` と `npm run dev` は両方を先に実行する。`sst diff` を直接実行する場合は、先に手で実行しておく。

## GitHub Actions Secrets

必須:

- `AWS_REGION`
- `AWS_ROLE_ARN`
- `UMA_ONE_DRAW_TOPIC_DISCORD_WEBHOOK_URL`
- `ANIME_ANALYSIS_DISCORD_WEBHOOK_URL`
- `ALERT_DISCORD_WEBHOOK_URL`
- `DATABASE_URL`（develop 用 Neon branch の pooled 接続文字列）
- `DIRECT_DATABASE_URL`（develop 用 Neon branch の direct 接続文字列）
- `GCP_SERVICE_ACCOUNT_KEY`（BigQuery サービスアカウント鍵の JSON）
- `R2_CREDENTIALS`（`{"accountId":"...","accessKeyId":"...","secretAccessKey":"..."}` 形式の JSON）
- `YACCHO_DISCORD_BOT_TOKEN`
- `YACCHO_DISCORD_INTERACTION_PUBLIC_KEY`
- `YACCHO_DISCORD_APPLICATION_ID`
- `KAGUYA_DISCORD_BOT_TOKEN`
- `KAGUYA_DISCORD_INTERACTION_PUBLIC_KEY`
- `KAGUYA_DISCORD_APPLICATION_ID`

app/job 固有の secret は該当 app の README を参照。

## 過去分の BigQuery 連携

`Backfill anime metrics to BigQuery` workflow に取得日の開始・終了を渡すと、`scripts/backfill-anime-bigquery.js` が暦月ごとに区切って連携 Lambda を invoke する。

deploy 用の OIDC role には、連携 Lambda への `lambda:GetFunction` と `lambda:InvokeFunction` が必要。無い場合、スクリプトが関数の存在を確認する時点で AccessDenied になる。

## DB migration

CD が deploy 直前に `npm run db:migrate`（`prisma migrate deploy`）を実行する。commit 済みの `migration/migrations/` だけが適用される。手順は [migration/README.md](../migration/README.md)。

## BigQuery の手動セットアップ

1. GCP project で BigQuery API を有効化する。
2. dataset を手で作成する（テーブルは連携 Lambda が作成する）。
3. サービスアカウントを作成し、鍵を `GCP_SERVICE_ACCOUNT_KEY` へ登録する。

## Neon の手動セットアップ

1. Neon project を AWS ap-southeast-1 に作成する。
2. default branch を develop 用にし、ローカル用の child branch `local` を作成する。
3. 接続文字列を取得する: develop pooled（`DATABASE_URL`）、develop direct（`DIRECT_DATABASE_URL`）、local direct（手元の `.env`）。
4. schema / table は console で作らず、`CREATE SCHEMA` も含めてすべて Prisma migration で行う。

## R2 の手動セットアップ

1. Cloudflare dashboard の R2 でバケットを作成する。名前は `infra/sst.config.ts` の `mediaBucketName` が develop stage で決める値に揃える。develop 以外の stage を動かす場合は、stage 名が付いたバケットも同じ手順で作る。
2. R2 の API token を作成する。権限は **Object Read & Write**、適用範囲は 1 で作ったバケットだけにする。
3. Account ID・Access Key ID・Secret Access Key を `{"accountId":"...","accessKeyId":"...","secretAccessKey":"..."}` の JSON にまとめ、GitHub Secrets の `R2_CREDENTIALS` へ登録する。
4. personal stage を動かす場合は、その stage のバケット向けに作った token の JSON を SST secret `R2Credentials` へ登録する（「初回セットアップ」参照）。

## Discord スラッシュコマンドの同期

コマンドは各 interaction route の `contracts/commands.ts` で定義し、deploy 後に各 Discord application の global scope へ bulk overwrite する。

- CD（develop stage）: `sst shell --stage develop ... -- npm run discord:sync:run`
- ローカル（personal stage）: 対象 stage に secret を設定し `npm run discord:sync`
- `npm run discord:sync:dry`: 登録済みコマンドと登録予定を並べて表示する（送信しない）

## Discord の手動セットアップ

1. [Discord Developer Portal](https://discord.com/developers/applications) で Bot ごとに application を作成し、Bot を追加する。
2. **Application ID**・**Public Key**（General Information）と Bot **Token**（Bot タブ）を控える。
3. OAuth2 URL Generator で scope に `bot` と `applications.commands` を付けた招待 URL を生成し、対象 guild へ招待する。
4. `<Bot>_DISCORD_*` の 3 値を GitHub Secrets へ登録する。ローカルで同期する stage には `<Bot>Discord*` の SST secret を直接設定する。
5. 初回 deploy 後、出力された Function URL に `/discord/interactions/<bot 名>` を付け、各 Portal の **Interactions Endpoint URL** に設定する（エンドポイントが deploy 済みで動作している状態でのみ保存できる。以降 URL は変わらない）。

## AWS 認証

`aws-actions/configure-aws-credentials` で OIDC 認証する。`AWS_ROLE_ARN` に GitHub Actions から AssumeRole できる IAM role の ARN を設定する。

## GitHub Actions の Node.js runtime 警告

`Node.js xx is deprecated. The following actions target Node.js xx...` が出たら、workflow の `node-version` ではなく該当 action の major version を上げる。

例: `aws-actions/configure-aws-credentials@v3` → `@v6`。

## ローカル開発

```bash
npx sst diff --stage develop --config infra/sst.config.ts
```

develop stage の secret は CD（GitHub Secrets 経由）でのみ設定し、ローカルから操作しない。

### 初回セットアップ

1. SST がリソースを作成できる AWS credentials を用意する。
2. root `.env` に local branch の direct 接続文字列を `DIRECT_DATABASE_URL` として置き、`npm run db:migrate` を実行する。
3. personal stage に secret を登録する（`--stage` 省略時は personal stage）:

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
   npx sst secret set R2Credentials '{"accountId":"...","accessKeyId":"...","secretAccessKey":"..."}' --config infra/sst.config.ts
   ```

   登録状況の確認: `npx sst secret list --config infra/sst.config.ts`

4. `npm run dev` を実行する。
5. `uma-one-draw-topic-scheduler` のように one-time schedule を登録するジョブを手動起動した場合、dev セッション終了後に `npx sst remove --config infra/sst.config.ts` で personal stage を破棄し、残った schedule を消す。
6. 破棄のみの場合も `npx sst remove --config infra/sst.config.ts` を実行する。
