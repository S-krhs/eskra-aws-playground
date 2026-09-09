# Static Site Playground

Astro で `sasahara.uk` の静的サイトを生成する app です。`dist/` への生成物は `infra/sst.config.ts` の `StaticSitePlayground` が配信します。

ページの追加と配信の設定は [docs/sasahara-uk-site.md](../../docs/sasahara-uk-site.md)。

## コマンド

いずれも repo root から実行します。

```bash
npm run dev -w @eskra-aws-playground/static-site-playground        # 開発サーバー（http://localhost:4321）
npm run dev:stop -w @eskra-aws-playground/static-site-playground   # 開発サーバーの停止
npm run build -w @eskra-aws-playground/static-site-playground      # dist/ へ静的生成
npm run preview -w @eskra-aws-playground/static-site-playground    # build 済み dist/ の確認
```

Astro 7 の開発サーバーはデーモンとして常駐し、端末を閉じても動き続けます。停止は `npm run dev:stop`（`astro dev stop`）で行います。`npm run preview` も同じくデーモンで、`npm run preview:stop` で停止します。

`.astro` ディレクトリごと消すとデーモンの pid/port 記録を見失い、`dev:stop` が効かなくなります（`clean` は `dist` だけを消します）。稼働中のデーモンを置き換えたい場合は `astro dev --force` を使います。
