# アーキテクチャ

このドキュメントは、モノレポ全体の配置、package 境界、依存方向を定義します。
アプリ固有の構成は `apps/<app>/docs/`、package 固有の構成は各 package の `docs/` を参照します。

## 全体像

このリポジトリは npm workspaces と Turbo で管理する、AWS Lambda バッチアプリ向けの TypeScript モノレポです。
Lambda バッチアプリは `apps/` に置き、外部サービス連携は接続先ごとに `packages/integrations/<target>/` へ分離します。

```text
apps/
  batch-anime-analysis/
  batch-playground/
infra/
migration/
repositories/
packages/
  integrations/
    discord/
    sqs/
  libs/
    browser/
    utils/
docs/
```

## Workspace

- `apps/*`: デプロイ単位または実行単位のアプリ。
- `infra/`: SST など、アプリをデプロイするためのインフラ定義。
- `migration/`: Prisma schema と migration history。workspace ではなく、root の `prisma` CLI と `prisma.config.ts` から使う。
- `repositories/`: 複数 app から参照するデータアクセス境界。静的データ、DB、外部ストレージの詳細を隠蔽する。DB client と生成コード(`db/`、`generated/`)は exports に含めず app から import できない。
- `packages/integrations/*`: 外部サービス接続先ごとの integration package。
- `packages/libs/utils`: 汎用処理 package。dayjs のような軽量な npm 依存は持てる。
- `packages/libs/browser`: Playwright-core など browser 実行依存を持つ汎用処理 package。

将来的に複数 app で共有する業務関心が出た場合は、`packages/domain/` を追加できます。
`packages/domain/` は複数 app で共有されるドメインモデル、ルール、ユースケース寄りの純粋処理を置く場所とし、特定 app の Lambda イベント、ルーティング、外部サービス client を持ちません。

## 依存方向

依存は app から package へ流します。

```text
apps/* -> packages/libs/browser
apps/* -> packages/libs/utils
apps/* -> packages/integrations/* -> packages/libs/utils
apps/* -> repositories -> packages/libs/utils
```

- `repositories` は app へ依存しない。`packages/libs/utils` には依存できる。
- DB client、SQL、テーブル行構造は app へ漏らさず、repository package 内に閉じ込める。
- `packages/libs/*` から `apps/*`、`packages/domain/*`、`packages/integrations/*` を import しない。
- `packages/domain/*` から `apps/*`、`packages/integrations/*` を import しない。
- `packages/integrations/*` から `apps/*`、`packages/domain/*`、別の `packages/integrations/*` を import しない。
- 外部サービス連携や重い依存が必要な処理は、責務単位の package として切り出す。

## Feature 間依存

- `apps/<app>/src/features/<feature-a>/` から `apps/<app>/src/features/<feature-b>/` を import しない。
- feature 同士を組み合わせる必要がある場合は、`jobs/` など app の orchestration 層で行う。
- 複数 feature で継続的に共有する純粋処理は `packages/libs/utils`、複数 app で共有する業務関心は将来の `packages/domain` へ移す。

## Docs

- `docs/`: モノレポ全体の方針、共通ルール、CI/CD。
- `infra/`: SST app と AWS リソース定義。
- `apps/<app>/docs/`: app 固有の入口、ジョブ、feature、運用。
- `packages/integrations/<target>/docs/`: 接続先固有の integration 設計。
- `packages/libs/docs/`: libs 配下 package の設計。

## Package 方針

- integration は接続先ごとに package を分ける。重い通信ライブラリや認証 SDK が接続先ごとに増えるため。
- libs は依存の重さで `packages/libs/utils` と `packages/libs/browser` に分ける。
- `packages/libs/utils` は純粋処理を置く。dayjs のような軽量な npm 依存は持てるが、実行環境に影響する重い依存は持たない。
- `packages/libs/browser` は Playwright-core など browser 実行に必要な依存を持つ処理を置く。
- app 固有の parser や domain 型は libs に置かず、app の `features/` または `shared/` に置く。
