# CI/CD

このドキュメントは、GitHub Actions と SST deploy に必要な設定をまとめます。

## 対象 workflow

`.github/workflows/deploy.yml` は `main` ブランチへの push で実行します。

処理の流れ:

1. `npm ci`
2. `npm run format`
3. `npm run typecheck`
4. `npm run lint`
5. `npm run test`
6. AWS OIDC 認証
7. `npm run deploy`

`npm run typecheck` と `npm run lint` は Turbo 経由で workspace ごとに実行します。
`npm run deploy` は workspace の build を実行してから `sst deploy --stage develop --config infra/sst.config.ts` を実行します。

## デプロイ対象

SST は `infra/sst.config.ts` から次のリソースを管理します。

- Lambda function
- EventBridge Scheduler
- SQS Queue / DLQ
- Scheduler と SQS 連携に必要な IAM resource

各 app/job の Scheduler event payload と secret は、該当 app の README を参照します。

## GitHub Actions Secrets

必須:

- `AWS_REGION`
- `AWS_ROLE_ARN`
- `UMA_ONE_DRAW_TOPIC_DISCORD_WEBHOOK_URL`
- `ANIME_ANALYSIS_DISCORD_WEBHOOK_URL`

app/job 固有の GitHub Actions Secrets は、該当 app の README を参照します。

アニメ分析 worker は、Playwright / Chromium 実行に必要な runtime 依存を `infra/layers/browser-runtime` から Lambda Layer として発行して参照します。
この Layer は deploy 前に `npm run build:browser-runtime-layer` で `.tmp/layers/browser-runtime` に作成します。


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

ローカル実行に SST 用の schedule/timezone 変数は不要です。
app 配下の `.env.example` は `npm run local` に必要な値だけを載せます。

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
- Scheduler の event payload が該当 app の routing の job 名と一致し、secret 値を含んでいないか。
- `npm run validate` が通るか。
- `npx sst diff --stage develop --config infra/sst.config.ts` で意図しない差分が出ていないか。
