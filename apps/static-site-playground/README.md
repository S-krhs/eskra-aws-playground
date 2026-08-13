# Static Site Playground

Astro で静的サイトを生成する app です。現在はトップページ（`src/pages/index.astro`）だけの最小構成で、ビルド成果物は `dist/` に出力されます。

Lambda ではないため、`infra/sst.config.ts` にはまだ登録していません。デプロイ先（S3 + CloudFront など）を決めたら追加します。

## コマンド

いずれも repo root から実行します。

```bash
npm run dev -w @eskra-aws-playground/static-site-playground        # 開発サーバー
npm run build -w @eskra-aws-playground/static-site-playground      # dist/ へ静的生成
npm run preview -w @eskra-aws-playground/static-site-playground    # build 済み dist/ の確認
```

`npm run typecheck` / `npm run lint`（root）は turbo 経由でこの app も対象になります。

## 型チェック

`astro sync` で `.astro/types.d.ts` を生成してから `tsc --noEmit` を実行します。

`.astro` ファイルのテンプレート内の型チェックには公式の `astro check` が必要ですが、これが依存する Volar が repo の TypeScript 7 に未対応のため導入していません。テンプレートの記述ミスは `astro build` で検出します。Volar が TypeScript 7 に対応したら `astro check` へ移行できます。

## cookie 依存について

`cookie` は app のコードからは import しません。Astro 7 が `cookie@2` を要求する一方、root には別経路（`prisma-zod-generator` → `express`）の `cookie@0.7` が hoist されており、Astro のビルドが root 側を解決して失敗するため、app 直下に `cookie@2` を置いて解決先を固定しています。root の `cookie` が 2 系に上がったら削除できます。
