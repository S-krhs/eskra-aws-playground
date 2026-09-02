# sasahara.uk 静的サイト

このドキュメントは、`sasahara.uk` で配信する静的サイト（`apps/static-site-playground`）の人間向け運用マニュアルです。
インフラ・workflow を変更するときの実装ルールは `.claude/rules/infra-deploy.md`、サイト側の実装ルールは `.claude/rules/apps/static-site-playground.md` を参照します。

## 構成

`infra/sst.config.ts` の `StaticSitePlayground`（`sst.aws.StaticSite`）が CloudFront distribution と S3 バケット、配信物を持ちます。

```text
sasahara.uk (Route53 A/AAAA alias)
        ↓
  StaticSitePlayground (CloudFront + S3)
        ├─ /               → トップページ
        ├─ /helloworld/    → Hello World
        ├─ /gamble-rumble/ → 賭博の収支をツイートするツール
        └─ 上記以外         → S3 / CloudFront の標準エラー
```

## ドメインと証明書

独自ドメインは `develop` stage にだけ付きます。同じ alias を持てる distribution は 1 つだけのため、開発者個人の stage が本番の alias を奪わないようにする措置です。`develop` 以外の stage では CloudFront の既定ドメイン（`dxxxx.cloudfront.net`）で配信されます。公開 URL は deploy 出力の `siteUrl` に出ます。

証明書は SST が us-east-1 に ACM 証明書を作り、Route53 の hosted zone で DNS 検証します。A/AAAA alias レコードも SST が作るため、手動での証明書作成・レコード追加は不要です。

## 未知パスの扱い

存在しないパスは S3 オリジンの標準エラー応答をそのまま返します。専用の工事中ページや custom error response は持ちません。

SST の `StaticSite` では `assets.routes` にルート (`/`) を指定し、未知パスも S3 へ転送することで、`indexPage` による暗黙のフォールバックを避けています。private S3 オリジンに存在しないキーを要求した場合、通常は `403 AccessDenied` になります。

## ページの追加と移管

ページは `apps/static-site-playground/src/pages/` に足します。既存サイトのコンテンツを移管する場合も、S3 レベルでコピーせず Astro のページとして持ち込みます。配信物のバケットは SST が管理しており、手で置いたファイルは次の deploy で失われます。画像などの静的ファイルは `apps/static-site-playground/public/` に置きます。

## 運用メモ

- SST app は `removal: "remove"` です。`sst remove` を実行すると CloudFront・S3・Route53 レコードごと消えます。`develop` stage は `protect` によりローカルからの `sst remove` を拒否しますが、扱いには注意してください。
- deploy のたびに CloudFront のキャッシュは SST が invalidate します。
- distribution は CloudFront 定額プランの Free（月 100GB・100 万リクエスト、超過課金なし）で運用します。購読はコンソール（または PricingPlanManager API）の操作で SST の管理外です。プランが作る Web ACL の ARN は `transform.cdn.webAclArn` に設定します。設定しないと次の deploy で関連付けが外れます。
- 定額プランは 1 distribution・apex ドメイン 1 つが単位です。サイトを増やして 1 distribution に集約したくなったら、Router 構成に戻すかプランの範囲を確認します。
- 配信物のビルドは SST が `apps/static-site-playground` で `npm run build` を実行して作ります。root の `npm run build`（turbo）でも同じビルドが走るため、deploy 時は 2 回ビルドされます。
- `sst dev` ではこのサイトは起動しません（`dev: false`）。Astro の dev server はデーモンとして常駐し `sst dev` 終了後も残るためです。ローカル確認は `npm run dev -w @eskra-aws-playground/static-site-playground` を使います。
