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
| `GET /api/media` | 一覧。`logicalPath`・`contentTypePrefix`・`tag`・`limit` で絞り、`cursorUploadedAt` と `cursorId` で続きを取る。`state=trashed` でゴミ箱の側を読む |
| `GET /api/media/:id/thumbnail` | サムネイル。R2 から取って返す |
| `GET /api/media/:id/file` | 原本。`Range` を R2 へ素通しするので動画のシークが効く。`?download=1` で保存を促す |
| `POST /api/media/:id/trash` | ゴミ箱に入れる。DB の列を立てるだけで R2 の実体は残る(204) |
| `POST /api/media/:id/restore` | ゴミ箱から戻す(204) |
| `POST /api/media/:id/clipboard` | 原本を Windows の `%TEMP%\eskra-media-library\<id>\` へ書き、`Set-Clipboard` でファイルとして置く(204) |
| `PUT /api/media/:id/tags` | タグを入れ替える。知らない名前は作り、誰も使わなくなったタグは消す |
| `GET /api/tags` | 使われているタグを名前順に返す |
| `POST /api/sync` | 同期 Lambda を非同期で起動する。完了は待たない(202) |
| `GET /api/sync/status` | 直近の実行と、実行中の実行を返す |

## 画面

- 一覧は仮想スクロールで、末尾に近づくと次のページを継ぎ足す(1 ページ 200 件)。
- フォルダ(論理パス)と種別(画像 / 動画)で絞り込める。条件を変えると先頭から取り直す。
- タイルを押すと原本を開く。画像はそのまま、動画はその場で再生する(シークは `Range` で取り直す)。ダウンロードもここから。
- 「表示」でライブラリとゴミ箱を切り替える。ゴミ箱に入れても R2 の実体は消えず、開いたメディアから元に戻せる。
- コピーは 2 種類。「画像としてコピー」はブラウザのクリップボードへ画像として置く(PNG 以外は PNG に変換する)。
  「ファイルとしてコピー」は backend が Windows の `%TEMP%` へ書き出してファイル参照を置くので、動画でも使えるしエクスプローラーへ貼れる。
  貼り付けるまで参照が要るため、書き出したファイルは消さない(Windows の TEMP 掃除に任せる)。
- 同期ボタンで `POST /api/sync` を叩き、実行中は 2 秒ごとに進捗を読む。終わった時点で一覧を取り直す。
- 画面の API client は `shared-domains/media/library-api/openapi.json` から生成します。route を変えたら `generate:api` を実行してください。

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
