# Media Repositories

## 環境変数

R2 へ接続する `media-storage` は次の 2 つを読みます。DB の接続文字列は [migration/README.md](../../migration/README.md) を参照してください。

| 変数 | 用途 |
| --- | --- |
| `R2_CREDENTIALS` | R2 の API token を `{ accountId, accessKeyId, secretAccessKey }` の JSON にしたもの |
| `MEDIA_BUCKET` | メディアを置く R2 バケット名 |

## テスト

DB へ接続する integration テストは、`TEST_DATABASE_URL`(ローカル用 Neon branch)を設定したときだけ実行されます。
