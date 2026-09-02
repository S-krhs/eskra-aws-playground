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
| `src/features/` | 1 つの機能として成り立つ塊。状態・データ・表示をまとめて持つ | 他の画面から使う前提のない切り出し |
| `src/widgets/` | 複数のページに載る自己完結した UI ブロック。必要になったら作る | 1 ページでしか使わない塊 |
| `src/entities/` | 複数の feature が扱う対象の型・データと表示。必要になったら作る | 1 つの feature でしか使わない型・データ |
| `src/shared/` | 業務に依存しない再利用部品（UI キットなど） | 特定の画面・操作・対象に固有のもの |
| `src/layouts/` | ページ全体を包む共通の骨組み（`<html>`・`<head>`・共通ナビ） | ページ固有の本文 |
| `public/` | ビルドを通さずそのまま配信する静的ファイル（画像など） | ページ・コンポーネントの実装 |
| `astro.config.mjs` | Astro のビルド設定 | ページ・コンポーネントの実装 |

## ディレクトリ構成（Feature-Sliced Design）

`src/` は Feature-Sliced Design の層で分けます。Astro のルーティングが `src/pages/` を占有するため、FSD の `pages` 層は置かず、ルートのページは feature を 1 つ貼るだけにします。

```text
src/pages/gamble-rumble/index.astro       ルート
src/features/gamble-rumble/               ツール一式（model・lib・ui）
src/shared/ui/win-forms/                  Windows Forms 風の UI キット
src/shared/styles/index.css               Tailwind の入口
```

- slice は `ui/`（描画）・`model/`（業務上の判断や語彙を含む型・データ・文面）・`lib/`（業務上の判断を含まない変換・整形）の segment に分ける。必要な segment だけ作る。「負けました／勝ちました」のような言い回しは `model`、数値の整形や URL の組み立ては `lib`。
- import は下の層へだけ流す。`pages → widgets → features → entities → shared` の順で、逆流させない。同じ層の slice 同士も import しない。
- **層は上から順に作らない。実際に再利用される段になってから足す。** 1 つの画面でしか使わない操作は feature に閉じ込め、widget・entity を先回りで作らない。widget は「複数のページに載る自己完結した塊」、entity は「複数の feature が扱う対象」になって初めて切り出す。
- slice には public API として `index.ts` を置き、外からはそこだけを import する（`@/features/gamble-rumble`）。共通ルールのバレルファイル禁止に対する、この app 限定の例外。
- slice の内側は相対 import で書く（`../model/currency-unit.js`）。slice をまたぐときだけ alias で public API を指す（`@/shared/ui/win-forms`）。import を見ただけで slice の内か外かが分かるようにする。

## 実装ルール

- `.astro` ファイルには `In scope` / `Out of scope` の冒頭コメントを書かない。frontmatter（`---` で囲む部分）は script を書く場所であり、コメントだけのために frontmatter を作らない。`.ts` ファイルには共通ルールどおり書く。
- ページの `<html>` には `lang="ja"` を付ける。
- 静的生成（`output: "static"`）を前提にする。SSR やサーバー実行が必要になったら、Astro adapter の追加とデプロイ先の見直しをセットで検討する。
- npm 依存を追加する前に、Astro の組み込み機能（`Astro.glob`、content collections、`astro:assets`）で足りないか確認する。
- 他の workspace（`packages/*`・`shared-domains`・`repositories`）には依存しない。Lambda app とは実行環境もビルドも別であり、共有が必要になった時点で置き場所から検討する。
- 動作確認で `npm run dev` を起動したら、必ず `npm run dev:stop`（`astro dev stop`）で停止する。Astro 7 の開発サーバーはデーモンとして常駐するため、親プロセスを kill しても実体（`astro.mjs dev --json`）が残り、次の起動が `Another astro dev server is already running.` で失敗する。
- 未知パス用のページは持たない。`infra/sst.config.ts` の `assets.routes: ["/"]` で S3 へ転送し、オリジンの標準エラー応答を返す。`errorPage` / `indexPage` によるフォールバックを追加しない。
- `.ts` / `.tsx` をファイル名まで指して import するときは、相対でも alias でも共通ルールどおり `.js` 拡張子を付ける。Vite が `.ts` / `.tsx` へ解決する。slice の public API を指すときだけ拡張子なし（`@/shared/ui/win-forms`）で、ディレクトリの `index.ts` に解決される。`.astro` ファイルの import は `.astro` と書く。

## React island

操作に応じて画面が変わるページは `@astrojs/react` の island として実装します。ページ側は `.astro` のままで、`<Component client:load />` として島だけを hydrate します。

- island の状態は、その island の最上位 component が React の `useState` で持つ（現状は `features/gamble-rumble/ui/gamble-rumble.tsx`）。下位の component へは値と callback を props で渡す。状態管理ライブラリは入れない。
- 静的な表示だけのページに island を使わない。素の `.astro` で書く。

## スタイル

Tailwind CSS で書きます。素の CSS ファイルは使いません。`style` 属性は、ドラッグ位置のように実行時に決まる値だけに使います（Tailwind は class 名を静的に走査するため、実行時の値から class を作れない）。見た目の指定に使ってはいけません。`.astro` の scoped style は island の DOM に当たらないため、component 側に class で当てます。

| 置き場所 | 置くもの |
| --- | --- |
| component の `className` | 原則すべての見た目。theme に無い値は arbitrary value（`bg-[#ffe0e0]`）で書く |
| `src/shared/styles/index.css` | Tailwind の入口。`@import "tailwindcss"` と kit の読み込みだけを書く |
| `src/shared/ui/<kit>/<kit>.css` | UI キットの `@theme` トークンと `@utility`。kit の component が使う色・書体・枠 |
| slice 内の `.css` | class で書けないもの（`@keyframes` など）だけ。component から import する |
| ページの `<style is:global>` | body に当たるページ全体の背景・余白 |

- slice 固有の色や書体を `shared` の `@theme` に足さない。使う component で arbitrary value を書く。
- 表示するかどうか、どの見た目で出すかの判断は呼び出し側に置き、component は渡された前提で描画する。`props` を見て `null` を返したり、閾値と比較したりしない。閾値は判断する側の 1 か所にまとめる。
- `@theme` と `@utility` は Tailwind の入口から辿れる CSS にしか書けない。入口が読むのは `shared` までとし、上の層の CSS を読ませない。
- data URI を背景の arbitrary value にしない。生成 CSS が PostCSS の `Unclosed string` で落ち、`astro build` は通るのに dev サーバーだけが動かなくなる。画像は `img` の `src` に置く。
- Tailwind は class 名を生のテキストとして走査する。コメントや文字列に class の形をした語を書くと、それも拾って CSS を生成する。
- `:active` は `disabled` な要素にも当たる。押下時の見た目を `active:` variant で付けるときは、無効時に当たらないよう class ごと分岐させる。`disabled:` variant を足すだけでは押し込まれて見える。

## lint

`npm run lint` は `biome ci .` と `steiger ./src` を続けて実行します。CI の `npm run lint`（root）が turbo 経由でこれを呼ぶため、FSD 違反は CI で落ちます。

### steiger（FSD 公式 linter）

層と import の向きを検査します。設定は `steiger.config.js` です。

- 設定は `.js` で書く。cosmiconfig の TypeScript loader が repo の TypeScript 7 に未対応で、`steiger.config.ts` を置くと `findConfigFile is not a function` で落ちる。
- `src/pages/**` は対象外。Astro のルーティングであって FSD の `pages` 層ではなく、`index.astro` を層の public API と誤検知する。
- `fsd/insignificant-slice` は `src/features/gamble-rumble` に限って off。この slice を参照するのは Astro のページだけで、それは上で対象外にしているため steiger からは参照ゼロに見える。他の slice では有効なままにする。
- 上記以外は無効化しない。`fsd/public-api` を守るため slice には `index.ts` を置く。層をまたぐ誤りを捕まえる `fsd/forbidden-imports` と、切り出しすぎを指摘する `fsd/insignificant-slice` は特に残す。
- ルールを無効化して通すより、指摘に従って構成を直すことを優先する。`insignificant-slice` は「その層はまだ要らない」という指摘であることが多い。

### biome の Tailwind ルール

`biome.json` の override で `apps/static-site-playground/**` にだけ `useSortedClasses` と `useTailwindShorthandClasses` を有効にしている。どちらも nursery なので、biome を上げたときに指摘内容が変わりうる。

`useSortedClasses` の修正は unsafe fix 扱いのため `biome check --write` では当たらない。`biome check --write --unsafe` を `.tsx` に対して実行する。`.astro` を含めると未使用 import が消えてビルドが壊れるため、対象を絞ること。

`noTailwindArbitraryValue` は入れていない。有効にすると 11 件出るが、いずれも意図した arbitrary value で、消すには slice 固有の値を `shared` の `@theme` へ移すしかない。上のスタイル方針と衝突する。`repeating-conic-gradient` のような値は `@theme` の namespace にも収まらない。

### biome のその他の設定

`.astro` の frontmatter は biome が単体の script として解釈し、テンプレートでしか使わない import と `Props` を未使用と判定する。`biome.json` の override で `**/*.astro` の `noUnusedImports` / `noUnusedVariables` を off にしている。CI は warning でも通るが、off にしないと `biome check --write --unsafe` が import を消してビルドを壊す。

## 型チェック

`typecheck` は `astro sync && tsc -p tsconfig.json --noEmit` です。`astro sync` が `.astro/types.d.ts` を生成し、`tsc` が `.ts` と `astro.config.mjs` を検査します。

`.astro` のテンプレート内の型は検査していません。公式の `astro check` が依存する Volar が repo の TypeScript 7 に未対応で、実行すると `useCaseSensitiveFileNames` の参照で落ちるためです。テンプレートの記述ミスは `astro build` で検出します。Volar が TypeScript 7 に対応したら `astro check` へ移行します。

## cookie 依存

`package.json` の `cookie` は app のコードから import しません。Astro 7 が要求する `cookie@2` に対し、root には `prisma-zod-generator` → `express` 経由の `cookie@0.7` が hoist されています。Astro のビルドは app root から `cookie` を解決するため、app 直下に `cookie@2` を置かないと `parseCookie` が見つからずビルドが失敗します。root の `cookie` が 2 系に上がったら削除します。
