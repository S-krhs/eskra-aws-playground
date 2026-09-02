---
paths:
  - "apps/static-site-playground/**"
---

# Static Site Playground

Astro で `sasahara.uk` の静的サイトを生成する app です。`astro build` が `dist/` へ HTML と asset を出力し、`infra/sst.config.ts` の `StaticSitePlayground`(CloudFront + S3)が配信します。未知パスはオリジンの標準エラーを返します。配信構成は `docs/sasahara-uk-site.md` を参照します。

## 層と責務

| 層 | 置くもの | 置かないもの |
| --- | --- | --- |
| `src/pages/` | Astro のルーティング。ファイルパスがそのまま URL になる。widget を貼るだけの薄いページにする | UI の実装、データ取得の実装 |
| `src/widgets/` | ページに載せる自己完結した UI ブロック。状態を持ち、feature と entity を組み立てる | 個々の操作の実装、業務上の対象の定義 |
| `src/features/` | ユーザー操作 1 つ分の UI と、その操作に固有の処理 | 複数の操作の組み立て、対象そのものの定義 |
| `src/entities/` | 業務上の対象（収支・通貨単位）の型・データと、その表示・変換 | 操作のハンドリング、画面全体の構成 |
| `src/shared/` | 業務に依存しない再利用部品（UI キットなど） | 特定の画面・操作・対象に固有のもの |
| `src/layouts/` | ページ全体を包む共通の骨組み（`<html>`・`<head>`・共通ナビ） | ページ固有の本文 |
| `public/` | ビルドを通さずそのまま配信する静的ファイル（画像など） | ページ・コンポーネントの実装 |
| `astro.config.mjs` | Astro のビルド設定 | ページ・コンポーネントの実装 |

## ディレクトリ構成（Feature-Sliced Design）

`src/` は Feature-Sliced Design の層で分けます。Astro のルーティングが `src/pages/` を占有するため、FSD の `pages` 層は置かず、ルートのページは widget を 1 つ貼るだけにします。

```text
src/pages/gamble-rumble/index.astro                  ルート
src/widgets/gamble-rumble/ui/                        窓の組み立てと状態
src/features/adjust-balance/{model,ui}/              投資・回収
src/features/select-currency-unit/ui/                単位の切り替え
src/features/share-balance/{lib,ui}/                 ツイート
src/entities/balance/{model,ui}/                     収支の境界値と表示
src/entities/currency-unit/{model,lib}/              単位の定義と換算
src/shared/ui/win-forms/                             Windows Forms 風の UI キット
```

- slice は `ui/`（描画）・`model/`（型・定数・データ）・`lib/`（純粋な変換処理）の segment に分ける。必要な segment だけ作る。
- import は下の層へだけ流す。`pages → widgets → features → entities → shared` の順で、逆流させない。
- 同じ層の slice 同士は import しない。組み合わせが必要なら 1 つ上の層で行う。
- 公開 API 用の `index.ts` は置かない。共通ルールでバレルファイルを禁止しているため、`@/entities/currency-unit/model/currency-unit.js` のように segment のファイルを直接指す。
- 1 ページでしか使わない UI でも、React island は `.astro` の中に書けないため widget として切り出す。

## 実装ルール

- `.astro` ファイルには `In scope` / `Out of scope` の冒頭コメントを書かない。frontmatter（`---` で囲む部分）は script を書く場所であり、コメントだけのために frontmatter を作らない。`.ts` ファイルには共通ルールどおり書く。
- ページの `<html>` には `lang="ja"` を付ける。
- 静的生成（`output: "static"`）を前提にする。SSR やサーバー実行が必要になったら、Astro adapter の追加とデプロイ先の見直しをセットで検討する。
- npm 依存を追加する前に、Astro の組み込み機能（`Astro.glob`、content collections、`astro:assets`）で足りないか確認する。
- 他の workspace（`packages/*`・`shared-domains`・`repositories`）には依存しない。Lambda app とは実行環境もビルドも別であり、共有が必要になった時点で置き場所から検討する。
- 動作確認で `npm run dev` を起動したら、必ず `npm run dev:stop`（`astro dev stop`）で停止する。Astro 7 の開発サーバーはデーモンとして常駐するため、親プロセスを kill しても実体（`astro.mjs dev --json`）が残り、次の起動が `Another astro dev server is already running.` で失敗する。
- 未知パス用のページは持たない。`infra/sst.config.ts` の `assets.routes: ["/"]` で S3 へ転送し、オリジンの標準エラー応答を返す。`errorPage` / `indexPage` によるフォールバックを追加しない。
- `.ts` / `.tsx` の import には、相対でも alias（`@/...`）でも共通ルールどおり `.js` 拡張子を付ける。Vite が `.ts` / `.tsx` へ解決する。`.astro` ファイルの import だけ `.astro` と書く。

## React island

操作に応じて画面が変わるページは `@astrojs/react` の island として実装します。ページ側は `.astro` のままで、`<Component client:load />` として島だけを hydrate します。

- island の状態は widget が React の `useState` で持ち、feature へは値と callback を props で渡す。状態管理ライブラリは入れない。
- 静的な表示だけのページに island を使わない。素の `.astro` で書く。

## スタイル

Tailwind CSS で書きます。`style` 属性でのインライン指定と、素の CSS ファイルは使いません。`.astro` の scoped style は island の DOM に当たらないため、component 側に class で当てます。

| 置き場所 | 置くもの |
| --- | --- |
| component の `className` | 原則すべての見た目。theme に無い値は arbitrary value（`bg-[#ffe0e0]`）で書く |
| `src/shared/styles/tailwind.css` | Tailwind の入口。`@import "tailwindcss"` と kit の読み込みだけを書く |
| `src/shared/ui/<kit>/<kit>.css` | UI キットの `@theme` トークンと `@utility`。kit の component が使う色・書体・枠 |
| slice 内の `.css` | class で書けないもの（`@keyframes` など）だけ。component から import する |
| ページの `<style is:global>` | body に当たるページ全体の背景・余白 |

- slice 固有の色や書体を `shared` の `@theme` に足さない。使う component で arbitrary value を書く。
- `@theme` と `@utility` は Tailwind の入口から辿れる CSS にしか書けない。入口が読むのは `shared` までとし、上の層の CSS を読ませない。

## lint

`npm run lint` は `biome ci .` と `steiger ./src` を続けて実行します。CI の `npm run lint`（root）が turbo 経由でこれを呼ぶため、FSD 違反は CI で落ちます。

### steiger（FSD 公式 linter）

層と import の向きを検査します。設定は `steiger.config.js` です。

- 設定は `.js` で書く。cosmiconfig の TypeScript loader が repo の TypeScript 7 に未対応で、`steiger.config.ts` を置くと `findConfigFile is not a function` で落ちる。
- `src/pages/**` は対象外。Astro のルーティングであって FSD の `pages` 層ではなく、`index.astro` を層の public API と誤検知する。
- `fsd/public-api` と `fsd/no-public-api-sidestep` は off。共通ルールでバレルファイルを禁止しているため slice に `index.ts` を置かない。
- `fsd/insignificant-slice` は off。slice の参照元が widget 1 つに寄るのは規模の問題で、層で分けること自体が目的のため。
- 上記以外は無効化しない。特に `fsd/forbidden-imports` は層をまたぐ誤りを実際に捕まえるため残す。

### biome

`.astro` の frontmatter は biome が単体の script として解釈し、テンプレートでしか使わない import と `Props` を未使用と判定する。`biome.json` の override で `**/*.astro` の `noUnusedImports` / `noUnusedVariables` を off にしている。CI は warning でも通るが、off にしないと `biome check --write --unsafe` が import を消してビルドを壊す。

## 型チェック

`typecheck` は `astro sync && tsc -p tsconfig.json --noEmit` です。`astro sync` が `.astro/types.d.ts` を生成し、`tsc` が `.ts` と `astro.config.mjs` を検査します。

`.astro` のテンプレート内の型は検査していません。公式の `astro check` が依存する Volar が repo の TypeScript 7 に未対応で、実行すると `useCaseSensitiveFileNames` の参照で落ちるためです。テンプレートの記述ミスは `astro build` で検出します。Volar が TypeScript 7 に対応したら `astro check` へ移行します。

## cookie 依存

`package.json` の `cookie` は app のコードから import しません。Astro 7 が要求する `cookie@2` に対し、root には `prisma-zod-generator` → `express` 経由の `cookie@0.7` が hoist されています。Astro のビルドは app root から `cookie` を解決するため、app 直下に `cookie@2` を置かないと `parseCookie` が見つからずビルドが失敗します。root の `cookie` が 2 系に上がったら削除します。
