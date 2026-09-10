# sasahara.uk 静的サイト

## ページの追加

ページは `apps/static-site-playground/src/pages/` に足す。画像などの静的ファイルは `apps/static-site-playground/public/` に置く。配信物のバケットは SST が管理しており、手で置いたファイルは次の deploy で失われる。

## ローカル確認

```bash
npm run dev -w @eskra-aws-playground/static-site-playground
```

`sst dev` ではこのサイトは起動しない（`dev: false`）。

## CloudFront 定額プランを変更したら

プランが作る Web ACL の ARN を `infra/sst.config.ts` の `transform.cdn.webAclArn` に設定する。設定しないと次の deploy で関連付けが外れる。
