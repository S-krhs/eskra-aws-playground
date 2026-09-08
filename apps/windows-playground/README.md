# Windows Playground

登録手順は [docs/media-library-uploader.md](../../docs/media-library-uploader.md)。

## コマンド

| コマンド | 用途 |
| --- | --- |
| `npm run media:upload -- <パス>...` | 引数のファイルを R2 の `_pending/` へ保存する(root で実行)。サムネイル生成後に `_inbox/` へ移る |

## 設定

設定ファイルの場所は `MEDIA_LIBRARY_CONFIG` で渡されます。`npm run media:upload` と「送る」のどちらも
`infra/local/` が決めた既定値（`~/.config/eskra-media-library/config.json`）を入れます。雛形は
`npm run build:local-launchers` が `.tmp/local/config.template.json` に書き出します。

```json
{
  "bucket": "eskra-media-library",
  "r2": {
    "accountId": "...",
    "accessKeyId": "...",
    "secretAccessKey": "..."
  }
}
```

`bucket` は雛形に `infra/sst.config.ts` の `mediaBucketName` と揃った値が入っています。
