# Libs アーキテクチャ

`packages/libs` は app/domain 非依存の汎用処理を置く領域です。ライブラリ依存の有無で `utils` と `browser` の 2 package に分けます。

## 配置

```text
packages/libs/
  utils/
    gacha/
      gacha-pool.ts
      gacha-pool.test.ts
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
- `packages/libs/utils` は npm ライブラリ依存を持たない。
- `packages/libs/browser` は browser 実行に必要な依存だけを持つ。

## 切り出し

ライブラリ依存が必要な処理を `utils` に混ぜないでください。依存が必要な場合は `browser` など責務単位の package へ分けます。
