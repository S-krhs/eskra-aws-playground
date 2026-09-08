# Media Library

常駐と PWA としての登録手順は [docs/media-library-app.md](../../docs/media-library-app.md)。

## コマンド

| コマンド | 用途 |
| --- | --- |
| `npm run media:library` | backend と画面をビルドして起動する(root で実行) |
| `npm run dev:ui -w @eskra-aws-playground/media-library` | 画面だけを Vite の dev サーバ(7421)で動かす。`/api` は 7420 へ中継する |

## API

すべて `/api` 配下です。残りの経路は画面の `index.html` へ落とします。

| 経路 | 用途 |
| --- | --- |
| `GET /api/media` | 一覧。`logicalPath`・`contentTypePrefix`・`limit` で絞り、`cursorUploadedAt` と `cursorId` で続きを取る |
| `GET /api/media/:id/thumbnail` | サムネイル。R2 から取って返す |
| `POST /api/sync` | 同期 Lambda を非同期で起動する。完了は待たない |
| `GET /api/sync/status` | 直近の実行と、実行中の実行を返す |

## 画面

- 一覧は仮想スクロールで、末尾に近づくと次のページを継ぎ足す(1 ページ 200 件)。
- フォルダ(論理パス)と種別(画像 / 動画)で絞り込める。条件を変えると先頭から取り直す。
- 同期ボタンで `POST /api/sync` を叩き、実行中は 2 秒ごとに進捗を読む。終わった時点で一覧を取り直す。

## 設定

アップローダと同じ `~/.config/eskra-media-library/config.json` を読みます。`MEDIA_LIBRARY_CONFIG` で場所を変えられます。

```json
{
  "bucket": "eskra-media-library",
  "r2": {
    "accountId": "...",
    "accessKeyId": "...",
    "secretAccessKey": "..."
  },
  "databaseUrl": "postgresql://...",
  "syncFunctionName": "eskra-aws-playground-develop-media-sync",
  "awsRegion": "ap-southeast-1",
  "port": 7420
}
```

| 項目 | 必須 | 内容 |
| --- | --- | --- |
| `bucket` / `r2` | 必須 | アップローダと共通。同期 Lambda が読む bucket と同じ名前にする |
| `databaseUrl` | 必須 | Neon の pooled 接続文字列。develop の DB を読む |
| `syncFunctionName` | 必須 | 同期 Lambda の関数名。`POST /api/sync` の起動先 |
| `awsRegion` | 必須 | 同期 Lambda が居る region |
| `port` | 任意 | 既定は 7420 |

`POST /api/sync` は AWS の認証情報を使います。`~/.aws/credentials` か環境変数で、対象 Lambda への `lambda:InvokeFunction` を持つ資格情報を用意してください。
