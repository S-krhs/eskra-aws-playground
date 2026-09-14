# Media Library

常駐と PWA としての登録手順は [docs/media-library-app.md](../../docs/media-library-app.md)。

## コマンド

| コマンド | 用途 |
| --- | --- |
| `npm run media:library` | backend と画面をビルドして起動する(root で実行) |
| `npm run dev:ui -w @eskra-aws-playground/media-library` | 画面だけを Vite の dev サーバ(7421)で動かす。`/api` は 7420 へ中継する |
| `npm run generate:api -w @eskra-aws-playground/media-library` | route を変えた後に実行する。`shared-domains/media/library-api/openapi.json` を書き出し、画面の client を再生成する |

## API

すべて `/api` 配下です。残りの経路は画面の `index.html` へ落とします。

| 経路 | 用途 |
| --- | --- |
| `GET /api/media` | 一覧。`logicalPath`・`contentTypePrefix`・`tag`・`limit` で絞り(`tag` は繰り返すと、そのすべてが付いたものに絞る)、`cursorUploadedAt` と `cursorId` で続きを取る。`state` は `filed`(既定。フォルダへ入れたもの)・`inbox`(まだどこにも入れていないもの)・`trashed`(ゴミ箱)の 3 つ |
| `GET /api/media/:id/thumbnail` | サムネイル。R2 から取って返す |
| `GET /api/media/:id/file` | 原本。`Range` を R2 へ素通しするので動画のシークが効く。`?download=1` で保存を促す |
| `POST /api/media/:id/trash` | ゴミ箱に入れる。R2 の実体も `_deleted/` へ移し、入っていたフォルダはその下に保つ(204) |
| `POST /api/media/:id/restore` | ゴミ箱から戻す。`_deleted/` の下に保っていたフォルダへ戻す(204) |
| `POST /api/media/:id/clipboard` | 原本を Windows の `%TEMP%\eskra-media-library\<id>\` へ書き、`Set-Clipboard` でファイルとして置く(204) |
| `PATCH /api/media/:id` | フォルダへ移す。R2 の Copy+Delete(5GB 超は multipart copy)と DB の付け替えを行う。空文字で `_inbox/` へ戻す |
| `PUT /api/media/:id/tags` | タグを入れ替える。知らない名前は作り、誰も使わなくなったタグは消す |
| `GET /api/folders` | 登録済みのフォルダと、メディアが実際に入っているフォルダを名前順に返す |
| `GET /api/tags` | 使われているタグを、付いているメディアの件数と一緒に件数の多い順で返す。`state`・`logicalPath`・`contentTypePrefix`・`tag` を一覧と同じように渡すと、その絞り込みに合うメディアだけを数え、どれにも付いていないタグは返さない。`state` を省くとゴミ箱と未整理も含めて数える |
| `POST /api/sync` | 同期 Lambda を非同期で起動する。完了は待たない(202) |
| `GET /api/sync/status` | 直近の実行と、実行中の実行を返す |

## 設定

アップローダと同じ設定ファイルを読みます。場所は `MEDIA_LIBRARY_CONFIG` で渡され、`npm run media:library` と systemd unit の
どちらも `infra/local/` が決めた既定値（`~/.config/eskra-media-library/config.json`）を入れます。雛形は
`npm run build:local-launchers` が `.tmp/local/config.template.json` に書き出します。

```json
{
  "bucket": "eskra-media-library",
  "r2": {
    "accountId": "...",
    "accessKeyId": "...",
    "secretAccessKey": "..."
  },
  "databaseUrl": "postgresql://...",
  "syncEndpointUrl": "https://xxxxx.lambda-url.ap-southeast-1.on.aws/media/sync",
  "syncToken": "...",
  "port": 7420
}
```

| 項目 | 必須 | 内容 |
| --- | --- | --- |
| `bucket` / `r2` | 必須 | アップローダと共通。`bucket` は雛形に deploy と揃った値が入っている |
| `databaseUrl` | 必須 | Neon の pooled 接続文字列。develop の DB を読む |
| `syncEndpointUrl` | 必須 | 同期の起動を受け付けるエンドポイント。SST の出力 `functionUrl` に `/media/sync` を付けた URL |
| `syncToken` | 必須 | そのエンドポイントに付ける bearer token。GitHub Secret `MEDIA_SYNC_TOKEN` と同じ値 |
| `port` | 任意 | 既定は 7420 |

`POST /api/sync` は `syncEndpointUrl` を叩くだけなので、AWS の認証情報は要りません。Lambda の invoke は
エンドポイント側が自分のロールで行います。エンドポイントの仕様は
[apps/function-url-playground/README.md](../function-url-playground/README.md) を参照。
