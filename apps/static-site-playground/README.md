# Static Site Playground

Astro で `sasahara.uk` の静的サイトを生成する app です。ビルド成果物は `dist/` に出力され、`infra/sst.config.ts` の `StaticSitePlayground`（S3）と `SiteRouter`（CloudFront）が配信します。

配信構成と移管の進め方は [docs/sasahara-uk-site.md](../../docs/sasahara-uk-site.md) を参照します。

## コマンド

いずれも repo root から実行します。

```bash
npm run dev -w @eskra-aws-playground/static-site-playground        # 開発サーバー（http://localhost:4321）
npm run dev:stop -w @eskra-aws-playground/static-site-playground   # 開発サーバーの停止
npm run build -w @eskra-aws-playground/static-site-playground      # dist/ へ静的生成
npm run preview -w @eskra-aws-playground/static-site-playground    # build 済み dist/ の確認
```

`npm run typecheck` / `npm run lint`（root）は turbo 経由でこの app も対象になります。

Astro 7 の開発サーバーはデーモンとして常駐し、`npm run dev` を起動した端末を閉じても動き続けます。停止は `npm run dev:stop`（`astro dev stop`）で行います。Ctrl+C や `pkill` ではデーモン本体が残り、次の `npm run dev` が `Another astro dev server is already running.` で失敗します。稼働中のデーモンを置き換えたい場合は `astro dev --force` を使います。

## 型チェック

`astro sync` で `.astro/types.d.ts` を生成してから `tsc --noEmit` を実行します。

`.astro` ファイルのテンプレート内の型チェックには公式の `astro check` が必要ですが、これが依存する Volar が repo の TypeScript 7 に未対応のため導入していません。テンプレートの記述ミスは `astro build` で検出します。Volar が TypeScript 7 に対応したら `astro check` へ移行できます。

## cookie 依存について

`cookie` は app のコードからは import しません。Astro 7 が `cookie@2` を要求する一方、root には別経路（`prisma-zod-generator` → `express`）の `cookie@0.7` が hoist されており、Astro のビルドが root 側を解決して失敗するため、app 直下に `cookie@2` を置いて解決先を固定しています。root の `cookie` が 2 系に上がったら削除できます。
