# Libs アーキテクチャ

`packages/libs` は app/domain 非依存の汎用処理を置く領域です。依存の重さで `utils` と `browser` の 2 package に分けます。

## 配置

```text
packages/libs/
  utils/
    date/
      current-jst-date.ts
      current-jst-date.test.ts
    gacha/
      gacha-pool.ts
      gacha-pool.test.ts
    logger/
      batch-logger.ts
      batch-logger.test.ts
    string/
      text-sanitizer.ts
      text-sanitizer.test.ts
    package.json
    tsconfig.json
  browser/
    html-scraper/
      chromium-browser.ts
      webpage-html.ts
    package.json
    tsconfig.json
```

## 依存方向

- `apps/*` を import しない。
- `packages/domain/*` を import しない。
- `packages/integrations/*` を import しない。
- `packages/libs/utils` は dayjs のような軽量な npm 依存だけを持てる。実行環境に影響する重い依存は持たない。
- `packages/libs/browser` は browser 実行に必要な依存だけを持つ。

## 切り出し

browser 実行のような重い依存が必要な処理を `utils` に混ぜないでください。その場合は `browser` など責務単位の package へ分けます。
