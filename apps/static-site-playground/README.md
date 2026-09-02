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

Astro 7 の開発サーバーはデーモンとして常駐し、`npm run dev` を起動した端末を閉じても動き続けます。停止は `npm run dev:stop`（`astro dev stop`）で行います。`npm run preview` も同じくデーモンで、`npm run preview:stop` で停止します。

稼働中のデーモンは `.astro/dev.json` に pid と port を記録しており、`dev:stop` と `dev status` はこのファイルを見ます。そのため `clean` は `dist` だけを消します。`.astro` ごと消すと記録を見失い、`dev:stop` が効かない・次の `npm run dev` が別 port（4322、4323…）で起動する・ブラウザで開いていた 4321 が古いサーバーのまま残る、という状態になります。Ctrl+C や `pkill` ではデーモン本体が残り、次の `npm run dev` が `Another astro dev server is already running.` で失敗します。稼働中のデーモンを置き換えたい場合は `astro dev --force` を使います。

## ページ

| パス | 内容 |
| --- | --- |
| `/` | トップページ |
| `/helloworld/` | 動作確認用 |
| `/gamble-rumble/` | 賭博の収支を単位付きで積み上げ、X へ投稿するツール |

`/gamble-rumble/` は `@astrojs/react` の island（`src/features/gamble-rumble/`）です。収支は円で保持し、選んだ単位（円・ｳｪﾌｧｰ・どきゅーと）へ換算して表示します。見た目は Windows Forms 風で、共通の枠・ボタン・ステータスバーは `src/shared/ui/win-forms/` にまとまっています。

## ディレクトリ構成

`src/` は Feature-Sliced Design の層で分け、Astro の `src/pages/` はルーティングだけを持ちます。現在あるのは `features/gamble-rumble`（ツール一式）と `shared/ui/win-forms`（再利用する UI キット）だけで、`widgets` と `entities` は再利用が実際に必要になった時点で足します。層の責務と import の向きは `.claude/rules/apps/static-site-playground.md` を参照します。

slice の public API は `index.ts` です。repo 共通ルールはバレルファイルを禁止していますが、この app は FSD の作法に合わせた例外として `index.ts` を置きます。

構成の検査には FSD 公式の linter である [steiger](https://github.com/feature-sliced/steiger) を使います。`npm run lint` が `biome ci .` に続けて `steiger ./src` を実行するため、層をまたぐ import は CI で落ちます。設定と、無効化しているルールの理由は `steiger.config.js` に書いてあります。

## スタイル

Tailwind CSS v4 を `@tailwindcss/vite` 経由で使います。入口は `src/shared/styles/index.css` で、ページから読み込みます。Windows Forms 風の配色・立体枠は `src/shared/ui/win-forms/win-forms.css` の `@theme` と `@utility` にまとめてあります。

## 型チェック

`astro sync` で `.astro/types.d.ts` を生成してから `tsc --noEmit` を実行します。

`.astro` ファイルのテンプレート内の型チェックには公式の `astro check` が必要ですが、これが依存する Volar が repo の TypeScript 7 に未対応のため導入していません。テンプレートの記述ミスは `astro build` で検出します。Volar が TypeScript 7 に対応したら `astro check` へ移行できます。

## cookie 依存について

`cookie` は app のコードからは import しません。Astro 7 が `cookie@2` を要求する一方、root には別経路（`prisma-zod-generator` → `express`）の `cookie@0.7` が hoist されており、Astro のビルドが root 側を解決して失敗するため、app 直下に `cookie@2` を置いて解決先を固定しています。root の `cookie` が 2 系に上がったら削除できます。
