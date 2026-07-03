# 実装ルール

このドキュメントは、モノレポ全体で共通する実装ルールを定義します。
配置と依存方向は `docs/architecture.md` を参照します。

## 基本方針

- 小さく明示的に実装し、暗黙の副作用や広すぎる共通化を避ける。
- 状態を持たない純粋な処理は class にしない。関数として実装する。
- TypeScript の `strict` を前提に、外部入力は利用箇所の近くで型を絞る。
- ESM に合わせ、相対 import には `.js` 拡張子を付ける。
- `index.ts` とバレルファイルは禁止する。import 先のファイル名から責務が分かるようにする。
- シークレット、Webhook URL、不要に詳しい本文はログやレスポンスに含めない。

## ファイル冒頭コメント

各実装ファイル冒頭には、次の 2 行をこの順番で記載します。

```ts
// In scope: <このファイルが担当すること>
// Out of scope: <このファイルが担当しないこと>
```

- `やること` が複数の大きな処理を含む場合は、ファイルを分割する。
- ファイル名と `やること` は同じ責務を指すようにする。

## JSDoc

- export する関数、class、interface、type、const には JSDoc を付ける。
- 複雑な型、判断に迷いやすい仕様、外部から呼ばれる公開 API にも JSDoc を付ける。
- 自明な代入や内部処理には JSDoc を付けない。

## 依存追加

- まず標準 API と既存依存で解決する。
- 新しい npm 依存を追加する場合は、用途、代替案、Lambda パッケージサイズへの影響を確認する。
- integration 固有の依存は、該当する `packages/integrations/<target>/package.json` に追加する。
- app 固有の依存は、該当する `apps/<app>/package.json` に追加する。
- repo 全体の開発ツールだけを root `package.json` に追加する。

## 検証

- 変更後は最低限 `npm run typecheck` を実行する。
- import、フォーマット、未使用コードに触れた場合は `npm run lint` も実行する。
- リリース前や複数ファイルを触った場合は `npm run validate` を実行する。
- Webhook 実送信を伴う確認は、送信先と環境変数を明示してから行う。

## 変更時チェックリスト

- 責務は `docs/architecture.md` の package 境界に収まっているか。
- 依存方向に逆流がないか。
- feature 間 import が発生していないか。
- export された API に JSDoc があるか。
- package 固有のルールを `apps/<app>/docs/` または `packages/**/docs/` に追記したか。
- `npm run validate` で確認したか。
