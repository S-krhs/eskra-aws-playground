---
paths:
  - "infra/**"
  - ".github/workflows/**"
---

# インフラ・デプロイ

SST(`infra/sst.config.ts`)と GitHub Actions workflow の実装ルールです。人間向けの運用手順・手動セットアップ記録は `docs/ci-cd.md` を参照します。

## SST 管理リソース

`infra/sst.config.ts` は次のリソースを管理します。

- Lambda function
- EventBridge Scheduler
- SQS Queue / DLQ
- 失敗検知用の SNS Topic と CloudWatch alarm(DLQ 滞留、Orchestrator エラー、BigQuery 連携エラー)
- browser runtime Lambda Layer と、その archive を置く S3 asset bucket
- Scheduler、SQS、SNS 連携に必要な IAM resource
- 静的サイト配信の CloudFront・S3 bucket(`StaticSitePlayground`)、ACM 証明書、Route53 レコード

各 app/job の Scheduler event payload と secret は、該当 app の README を参照します。

## 設計上の制約

- `sst.config.ts` は SST が生成する `.sst/platform` の型に依存し CI には存在しないため、型検査は設定値を持つ `infra/config/` と layer 定義の検証テストを持つ `infra/layers/` に限定する(`infra/tsconfig.json` の `include`。lint は `sst.config.ts` も対象)。
- develop stage は CD(GitHub Actions)専用とし、2 段で保護する。`run()` 冒頭のガードが `run()` を評価するコマンド(`deploy`・`dev`・`refresh`)のうち `diff` 以外を拒否し(`GITHUB_ACTIONS` env と SST 内部 API の `$cli.command` で判定。env 判定を先に置き CD 経路から `$cli` 参照を外す)、`app()` の `protect` が `run()` を評価しない `sst remove` を拒否する。`sst secret set/list` はどちらも経由しないため develop の secret は CD 経由でのみ設定する。
- schedule 起動の Scheduler(cron)は `$dev`(`sst dev`)では作成しない。sst dev はローカルコード検証用途であり、dev セッション終了後に cron だけが発火し続けるのを防ぐため。
- secret は stage ごとの SST secret を唯一の供給元とする。CD は deploy step で `SST_SECRET_*` env として書き込み、実行側は `sst shell` 経由(script)または `Resource`(Lambda)で読む。secret を env で直接渡さない。
- browser runtime Layer の archive は Lambda の direct upload 上限を避けるため、versioning を有効にした `sst-asset-*` S3 bucket に置いてから publish する。
- GCP 側のリソース(project・dataset・サービスアカウント)は SST の管理外とし、手動セットアップの記録を `docs/ci-cd.md` と該当 app の README に残す。stage ごとに分ける値(dataset 名)は `sst.config.ts` で決め、環境変数として Lambda へ渡す。

## 変更時チェックリスト

- workflow の Node.js version と Lambda runtime が意図した範囲に収まっているか。
- workflow の default permissions が read-only で、OIDC は deploy job だけに付与されているか。
- workflow 内の `uses:` action が deprecated Node.js runtime を target していないか。
- 新しい必須 env を追加した場合、GitHub Secrets(`docs/ci-cd.md` の一覧)と該当 app の README を更新したか。
- 破壊的 migration(column の drop / rename / 型変更)を含む場合、PR 本文に明記したか。
- `DIRECT_DATABASE_URL` が migration step 以外に渡っていないか。
- Scheduler の event payload が該当 app の routing の job 名と一致し、secret 値を含んでいないか。
- `npm run validate` が通るか。
- `npx sst diff --stage develop --config infra/sst.config.ts` で意図しない差分が出ていないか。
