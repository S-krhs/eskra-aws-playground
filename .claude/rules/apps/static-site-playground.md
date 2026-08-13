---
paths:
  - "apps/static-site-playground/**"
---

# Static Site Playground

Astro で `sasahara.uk` の静的サイトを生成する app です。`astro build` が `dist/` へ HTML と asset を出力し、`infra/sst.config.ts` の `StaticSitePlayground`(CloudFront + S3)が配信します。未知パスは工事中ページを 404 で返します。配信構成は `docs/sasahara-uk-site.md` を参照します。

## 層と責務

| 層 | 置くもの | 置かないもの |
| --- | --- | --- |
| `src/pages/` | ルーティングに対応するページ。ファイルパスがそのまま URL になる | 再利用する UI 断片、データ取得の実装 |
| `src/components/` | 複数ページで使う UI 断片 | ページ固有のマークアップ、ルーティング |
| `src/layouts/` | ページ全体を包む共通の骨組み（`<html>`・`<head>`・共通ナビ） | ページ固有の本文 |
| `public/` | ビルドを通さずそのまま配信する静的ファイル（画像など） | ページ・コンポーネントの実装 |
| `astro.config.mjs` | Astro のビルド設定 | ページ・コンポーネントの実装 |

`src/components/` は必要になった時点で作ります。1 ページでしか使わない断片は切り出さず、ページに直接書きます。

## 実装ルール

- `.astro` ファイルには `In scope` / `Out of scope` の冒頭コメントを書かない。frontmatter（`---` で囲む部分）は script を書く場所であり、コメントだけのために frontmatter を作らない。`.ts` ファイルには共通ルールどおり書く。
- ページの `<html>` には `lang="ja"` を付ける。
- 静的生成（`output: "static"`）を前提にする。SSR やサーバー実行が必要になったら、Astro adapter の追加とデプロイ先の見直しをセットで検討する。
- npm 依存を追加する前に、Astro の組み込み機能（`Astro.glob`、content collections、`astro:assets`）で足りないか確認する。
- 他の workspace（`packages/*`・`shared-domains`・`repositories`）には依存しない。Lambda app とは実行環境もビルドも別であり、共有が必要になった時点で置き場所から検討する。
- 動作確認で `npm run dev` を起動したら、必ず `npm run dev:stop`（`astro dev stop`）で停止する。Astro 7 の開発サーバーはデーモンとして常駐するため、親プロセスを kill しても実体（`astro.mjs dev --json`）が残り、次の起動が `Another astro dev server is already running.` で失敗する。
- 未知パスの受け皿は `src/pages/under-construction/index.astro` が担い、`infra/sst.config.ts` の `errorPage` で指定する。Astro の `404.astro` は使わない。

## lint

`.astro` の frontmatter は biome が単体の script として解釈し、テンプレートでしか使わない import と `Props` を未使用と判定する。`biome.json` の override で `**/*.astro` の `noUnusedImports` / `noUnusedVariables` を off にしている。CI は warning でも通るが、off にしないと `biome check --write --unsafe` が import を消してビルドを壊す。

## 型チェック

`typecheck` は `astro sync && tsc -p tsconfig.json --noEmit` です。`astro sync` が `.astro/types.d.ts` を生成し、`tsc` が `.ts` と `astro.config.mjs` を検査します。

`.astro` のテンプレート内の型は検査していません。公式の `astro check` が依存する Volar が repo の TypeScript 7 に未対応で、実行すると `useCaseSensitiveFileNames` の参照で落ちるためです。テンプレートの記述ミスは `astro build` で検出します。Volar が TypeScript 7 に対応したら `astro check` へ移行します。

## cookie 依存

`package.json` の `cookie` は app のコードから import しません。Astro 7 が要求する `cookie@2` に対し、root には `prisma-zod-generator` → `express` 経由の `cookie@0.7` が hoist されています。Astro のビルドは app root から `cookie` を解決するため、app 直下に `cookie@2` を置かないと `parseCookie` が見つからずビルドが失敗します。root の `cookie` が 2 系に上がったら削除します。
