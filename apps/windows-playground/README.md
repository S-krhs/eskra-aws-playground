# Windows Playground

Windows のエクスプローラーから起動して使うツールを置く app です。
現時点ではメディアライブラリのアップローダ 1 つだけを持ちます。

Node は WSL 側にだけ置き、Windows には何もインストールしません。
エクスプローラーからは Windows 標準の `wsl.exe` を .lnk のターゲットにして呼び出します。
登録手順は [docs/media-library-uploader.md](../../docs/media-library-uploader.md) を参照してください。

## コマンド

| コマンド | 用途 |
| --- | --- |
| `npm run media:upload -- <パス>...` | 引数のファイルを R2 の `_inbox/` へ保存する(root で実行) |

## アップローダ

`src/scripts/media-upload.ts` が入口です。引数で渡された Windows のパスを WSL のパスへ直し、1 件ずつ R2 へ保存します。

- **DB には書きません。** UUID と元のファイル名を object metadata に載せるだけで、管理ツールに出てくるのは同期が走ったあとです。
- 対象は `src/features/media-upload/media-content-type.ts` に並べた拡張子だけです。それ以外は 1 件ずつ飛ばして続行します。
- key は更新日時から組み立てます。Windows の作成日時は WSL の `stat` からは取れない(`birthtime` が epoch 0 になる)ため使いません。
- 同じミリ秒に更新されたファイルは key が衝突するため、保存前に存在を確かめて `-2` から連番を振ります。
- 並列化していません。大きい動画が並んだときに帯域とメモリを食わないようにするためです。

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

R2 の API トークンは対象 bucket の Object Read & Write に絞ったものを使います。
`bucket` は同期 Lambda が読む bucket(`infra/sst.config.ts` の `mediaBucketName`)と同じ名前にします。ずれるとアップロードは成功するのに管理ツールへ出てきません。
このファイルは git 管理せず、内容はログにもエラーメッセージにも出しません。
