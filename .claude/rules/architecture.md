# アーキテクチャ

npm workspaces と Turbo で管理する、AWS Lambda アプリ向けの TypeScript モノレポです。
Lambda アプリは `apps/` に置き、外部サービス連携は接続先ごとに `packages/integrations/<target>/` へ分離します。

## 全体像

```text
apps/
  batch-anime-analysis/
  batch-playground/
  function-url-playground/
  static-site-playground/
infra/
migration/
repositories/
shared-domains/
  contracts/
  protocols/
packages/
  integrations/
    discord/
    scheduler/
    sqs/
  libs/
    browser/
    utils/
scripts/
docs/
```

## Workspace

- `apps/*`: デプロイ単位または実行単位のアプリ。
- `infra/`: SST など、アプリをデプロイするためのインフラ定義。
- `migration/`: Prisma schema と migration history。workspace ではなく、root の `prisma` CLI と `prisma.config.ts` から使う。
- `repositories/`: 複数 app から参照するデータアクセス境界。静的データ、DB、外部ストレージの詳細を隠蔽する。DB client と生成コード(`db/`、`generated/`)は exports に含めず app から import できない。
- `shared-domains/`: 複数 app で共有する app 固有の契約・ドメインデータ・protocol 処理を置くトップレベル workspace。`repositories` と同じく特定ドメインに依存し汎用配布できないため `packages/` には置かない。型・語彙・データを `contracts/`、通信を伴わない処理を `protocols/` に分ける。
- `packages/integrations/*`: 外部サービス接続先ごとの integration package。outbound 通信と inbound リクエストの wire 解釈の両方を担う。
- `packages/libs/utils`: 汎用処理 package。dayjs のような軽量な npm 依存は持てる。
- `packages/libs/browser`: Playwright-core など browser 実行依存を持つ汎用処理 package。
- `scripts/`: CI 補助スクリプト。workspace には含めない。

`packages/` は汎用・再利用可能なもの(integration・libs)に限定します。特定ドメインに依存する共有は、汎用配布できないため `shared-domains/`(データアクセスなら `repositories/`)へ置きます。

## 依存方向

依存は app から package・shared-domains へ流します。

```text
apps/* -> packages/libs/browser
apps/* -> packages/libs/utils
apps/* -> packages/integrations/* -> packages/libs/utils
apps/* -> repositories -> packages/libs/utils
apps/* -> shared-domains -> packages/libs/utils
```

- `repositories` と `shared-domains` は app へ依存しない。`packages/libs/utils` には依存できる。
- DB client、SQL、テーブル行構造は app へ漏らさず、repository package 内に閉じ込める。
- `packages/libs/*` から `apps/*`、`shared-domains`、`packages/integrations/*` を import しない。
- `shared-domains` から `apps/*`、`packages/integrations/*` を import しない。接続先固有でない規約(custom_id 規約など)の解釈は shared-domains、接続先の wire 型・通信・parse は integration に置き、両者を独立させる。
- `packages/integrations/*` から `apps/*`、`shared-domains`、別の `packages/integrations/*` を import しない。
- 外部サービス連携や重い依存が必要な処理は、責務単位の package として切り出す。

## Feature 間依存

- `apps/<app>/src/features/<feature-a>/` から `apps/<app>/src/features/<feature-b>/` を import しない。
- feature 同士を組み合わせる必要がある場合は、`jobs/` など app の orchestration 層で行う。
- 複数 feature で継続的に共有する純粋処理は `packages/libs/utils`、複数 app で共有する業務関心・契約は `shared-domains` へ移す。

## Package 方針

- integration は接続先ごとに package を分ける。重い通信ライブラリや認証 SDK が接続先ごとに増えるため。
- integration に置くもの: 接続先固有の型、outbound の HTTP 通信・認証、inbound リクエストの wire parse・署名検証、失敗応答のエラー変換。URL・token の解決、接続先固有でない規約の解釈(custom_id 規約など)、ジョブ判定、メッセージ生成、app 固有の業務型は置かない。
- libs は依存の重さで `packages/libs/utils`(純粋処理。軽量な npm 依存のみ)と `packages/libs/browser`(browser 実行依存)に分ける。
- app 固有の parser や domain 型は libs に置かない。単一 app 内なら app の `features/`、複数 app で共有するなら `shared-domains` に置く。

## ドキュメント体系

- `.claude/rules/`: 実装ルール。共通 rule は常時、workspace 別 rule は該当ファイルを扱うときに適用される。
- `docs/`: 人間向けの運用マニュアル(CI/CD、手動セットアップ記録)。
- 各 workspace の `README.md`: 利用者向けの公開 API・コマンド・secret の説明。
