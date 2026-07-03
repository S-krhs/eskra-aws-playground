# shared/infra

外部環境や実行基盤に近い共通型・共通実装を置きます。

例:

- Lambda イベントとバッチレスポンスの共通型
- SST linked secret の読み取り
- 環境変数の共通読み取り
- ログ出力の共通ラッパー
- Lambda や Node.js ランタイムに依存する薄い補助処理

個別サービス連携の具体処理は `packages/integrations/*` に置きます。
