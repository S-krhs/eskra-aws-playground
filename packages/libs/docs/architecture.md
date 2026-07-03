# Libs アーキテクチャ

`packages/libs` はドメイン非依存の純粋な汎用処理を置く package です。

## 配置

`src/` は作らず、関心ごとのディレクトリを package 直下に置きます。

```text
packages/libs/
  gacha/
    gacha-pool.ts
    gacha-pool.test.ts
  string/
    text-sanitizer.ts
    text-sanitizer.test.ts
```

## 依存方向

- `apps/*` を import しない。
- `packages/domain/*` を import しない。
- `packages/integrations/*` を import しない。
- 外部連携が必要な処理は、呼び出し側から関数や interface を渡す DI で表現する。

## 切り出し

個別 lib に独立した依存、ビルド設定、version 管理が必要になった場合だけ、`packages/libs/<lib-name>` を独立 package へ切り出します。
