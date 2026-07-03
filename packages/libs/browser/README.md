# Libs Browser

Playwright-core や Lambda 向け Chromium など、browser 実行に必要な依存を持つ共通ライブラリです。

## Public API

- `html-scraper/chromium-browser.ts`: Chromium の起動設定と起動処理。
- `html-scraper/webpage-html.ts`: URL から HTML string を取得する処理。

## 責務

- browser 起動、ページ遷移、HTML 取得を扱う。
- HTML 解析、metric 正規化、app 固有の scraping 定義変換は扱わない。
