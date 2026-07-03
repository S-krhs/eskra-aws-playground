# Discord Integration アーキテクチャ

`packages/integrations/discord` は Discord API との通信境界を担当する package です。

## 責務

- Discord 固有の型、HTTP 通信、レスポンスエラー変換を置く。
- Discord Webhook URL が Discord の HTTPS Webhook API を指すことを検証する。
- Webhook URL の解決、ジョブ判定、メッセージ生成は行わない。
- app 固有の型や feature 固有の値を import しない。

## 依存方向

```text
packages/integrations/discord -> packages/libs
```

- `apps/*` を import しない。
- `packages/domain/*` を import しない。
- 別の `packages/integrations/*` を import しない。
- 汎用的な純粋処理が必要な場合だけ `packages/libs` を使う。
