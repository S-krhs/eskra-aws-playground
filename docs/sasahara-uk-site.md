# sasahara.uk 静的サイト

このドキュメントは、`sasahara.uk` で配信する静的サイト（`apps/static-site-playground`）の人間向け運用マニュアルです。
インフラ・workflow を変更するときの実装ルールは `.claude/rules/infra-deploy.md`、サイト側の実装ルールは `.claude/rules/apps/static-site-playground.md` を参照します。

## 構成

`infra/sst.config.ts` の `SiteRouter`（`sst.aws.Router`）が `sasahara.uk` の CloudFront を持ち、`StaticSitePlayground`（`sst.aws.StaticSite`）が S3 バケットと配信物を持ちます。StaticSite は Router の root に載るため、独自の distribution は作りません。サイトを増やすときは Router に route を足し、この 1 つの distribution に集約します。

```text
sasahara.uk (Route53 A/AAAA alias)
        ↓
  SiteRouter (CloudFront)
        ↓
  StaticSitePlayground (S3)
        ├─ /helloworld/  → Hello World
        └─ 上記以外       → index.html（工事中）
```

## ドメインと証明書

独自ドメインは `develop` stage にだけ付きます。同じ alias を持てる distribution は 1 つだけのため、開発者個人の stage が本番の alias を奪わないようにする措置です。`develop` 以外の stage では CloudFront の既定ドメイン（`dxxxx.cloudfront.net`）で配信されます。公開 URL は deploy 出力の `siteUrl` に出ます。

証明書は SST が us-east-1 に ACM 証明書を作り、Route53 の hosted zone で DNS 検証します。Route53 の A/AAAA alias レコードは `override: true` で上書きするため、既存レコードがあっても deploy は通ります。手動での証明書作成・レコード削除は不要です。

## 未知パスの扱い

存在しないパスは CloudFront Function が `index.html`（工事中）へ書き換えて返します。ステータスコードは 200 です。

`sst.aws.StaticSite` の `errorPage` は指定していません。Router に載せた StaticSite では `errorPage` を指定すると、404 応答を組み立てる `customErrorResponses` が Router 側の distribution には適用されず、未指定時の `index.html` への書き換えも無効化されるため、未知パスが S3 の 403 XML をそのまま返すようになります。専用の 404 ページと 404 ステータスが必要になったら、Router のルーティング側で対応します。

## ページの追加と移管

ページは `apps/static-site-playground/src/pages/` に足します。既存サイトのコンテンツを移管する場合も、S3 レベルでコピーせず Astro のページとして持ち込みます。配信物のバケットは SST が管理しており、手で置いたファイルは次の deploy で失われます。

移管が終わったら、トップページ（`src/pages/index.astro`）の工事中表示を差し替えます。

## 運用メモ

- SST app は `removal: "remove"` です。`sst remove` を実行すると CloudFront・S3・Route53 レコードごと消えます。`develop` stage は `protect` によりローカルからの `sst remove` を拒否しますが、扱いには注意してください。
- deploy のたびに CloudFront のキャッシュは SST が invalidate します。
- 配信物のビルドは SST が `apps/static-site-playground` で `npm run build` を実行して作ります。root の `npm run build`（turbo）でも同じビルドが走るため、deploy 時は 2 回ビルドされます。
- `sst dev` ではこのサイトは起動しません（`dev: false`）。Astro の dev server はデーモンとして常駐し `sst dev` 終了後も残るためです。ローカル確認は `npm run dev -w @eskra-aws-playground/static-site-playground` を使います。
