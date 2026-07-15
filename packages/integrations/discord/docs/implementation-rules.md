# Discord Integration 実装ルール

- Discord API の request/response とエラー変換に集中する。
- Webhook URL や token などの secret 値をログやエラーメッセージに含めない。
- 外部 API 失敗は、呼び出し側が原因を区別できる error class に変換する。
- HTTP client や認証 SDK など Discord 固有の依存は、この package の `package.json` に追加する。
- 外部へ公開する実通信操作は、認証情報と通信設定を保持する client class にまとめる。
- client は構築済み payload を受け取り、protocol 固有の Parse / Build は行わない。
- HTTP 処理の補助純関数はファイル内 helper とし、単独の公開 API にしない。
- 境界データを表す type と interface は、class の入出力契約として export してよい。
- `index.ts` とバレルファイルは作らない。
