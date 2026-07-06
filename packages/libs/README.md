# Packages Libs

複数 app から使う app/domain 非依存の汎用処理を置く領域です。

## Package

- `utils`: 汎用の純粋処理。dayjs のような軽量な npm 依存は持てる。
- `browser`: Playwright-core など browser 実行に必要な依存を持つ処理。

## 置かないもの

- app 固有の parser、設定変換、通知文生成。
- DB や外部サービス固有の integration。
- 複数 app で共有する業務 domain。

業務 domain を共有したくなった場合は `packages/domain/*` を追加します。
