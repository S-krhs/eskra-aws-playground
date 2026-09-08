# Windows Playground

登録手順は [docs/media-library-uploader.md](../../docs/media-library-uploader.md)。

## コマンド

| コマンド | 用途 |
| --- | --- |
| `npm run media:upload -- <パス>...` | 引数のファイルを R2 の `_inbox/` へ保存する(root で実行) |

## 設定

`~/.config/eskra-media-library/config.json` を読みます。`MEDIA_LIBRARY_CONFIG` で場所を変えられます。

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

`bucket` は同期 Lambda が読む bucket(`infra/sst.config.ts` の `mediaBucketName`)と同じ名前にします。
