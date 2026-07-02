# CI/CD

このドキュメントは、GitHub Actions と SST deploy に必要な設定をまとめます。

## 対象 workflow

`.github/workflows/deploy.yml` は `main` ブランチへの push で実行します。

処理の流れ:

1. `npm ci`
2. `npm run format`
3. `npm run typecheck`
4. `npm run lint`
5. AWS OIDC 認証
6. `npm run deploy`

`npm run typecheck` と `npm run lint` は Turbo 経由で workspace ごとに実行します。
`npm run deploy` は workspace の build を実行してから `sst deploy --stage develop` を実行します。

## デプロイ対象

SST は `sst.config.ts` から次のリソースを管理します。

- Lambda function
- EventBridge Scheduler
- Scheduler から Lambda を呼び出すための IAM resource

UMA ワンドロお題通知の Scheduler は、Lambda に次のイベントを渡します。

```json
{
	"job": "uma-one-draw-topic",
	"webhookUrl": "https://discord.com/api/webhooks/xxx/yyy"
}
```

## GitHub Actions Secrets

必須:

- `AWS_REGION`
- `AWS_ROLE_ARN`
- `DEFAULT_DISCORD_WEBHOOK_URL`

`DEFAULT_DISCORD_WEBHOOK_URL` は、ジョブ固有の Webhook URL が未設定の場合に Scheduler のイベントへ渡します。

## GitHub Actions Secrets

任意:

- `UMA_ONE_DRAW_TOPIC_DISCORD_WEBHOOK_URL`

現在のデフォルト:

- schedule: `cron(0 21 * * ? *)`
- timezone: `Asia/Tokyo`

## AWS 認証

GitHub Actions は `aws-actions/configure-aws-credentials` で OIDC 認証します。
`AWS_ROLE_ARN` には GitHub Actions から AssumeRole できる IAM role の ARN を設定します。

この role には、SST が develop stage のリソースを作成・更新するための権限が必要です。
初期構築中は広めの権限でデプロイを通し、作成されるリソースが固まってから絞り込む方針にします。

## ローカルとの差分

ローカル実行に SST 用の schedule/timezone 変数は不要です。
`.env.example` は `npm run local` に必要な値だけを載せます。

ローカルで SST の構成確認をする場合:

```bash
npx sst diff --stage develop
```

このコマンドは AWS credentials が必要です。

## 変更時チェックリスト

- workflow の Node.js version と Lambda runtime が意図した範囲に収まっているか。
- 新しい必須 env を追加した場合、GitHub Secrets と README を更新したか。
- Scheduler の event payload が `apps/batch-playground/src/routing/batch-router.ts` の job 名と一致しているか。
- `npm run validate` が通るか。
- `npx sst diff --stage develop` で意図しない差分が出ていないか。
