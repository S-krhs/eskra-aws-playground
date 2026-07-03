# Libs Utils

npm ライブラリ依存を持たない、app/domain 非依存の共通処理を置くライブラリです。

## Public API

- `gacha/gacha-pool.ts`: 重み付き抽選 pool。
- `string/text-sanitizer.ts`: 文字列整形。

## 責務

- 入出力が閉じた純粋処理を扱う。
- browser、外部 API、DB、app 固有の parser や通知処理は扱わない。
