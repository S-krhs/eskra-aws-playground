# Media Repositories

Cloudflare R2 上の画像・動画ライブラリのメタデータアクセスを置きます。
オブジェクトの実体は R2 にあり、この境界が扱うのは `media` schema のメタデータだけです。
R2 への読み書きは `packages/integrations/r2` が担当し、両者を組み合わせるのは app 側の役目です。

## 同一性の持ち方

R2 の key は `{論理パス}/{更新日時}.{拡張子}` で、UUID は object の metadata に入っています。
key に UUID が含まれないため、`MediaObject.id`（= metadata の UUID）と `objectKey` の対応はこの table だけが持ちます。

`ListObjectsV2` は custom metadata を返しません。そのため同期は次の手順を取り、`findAllSummaries` はそのための射影です。

1. R2 の key を全件列挙する
2. `findAllSummaries` の結果と突き合わせ、既知の key はそのまま照合する
3. 未知の key にだけ `HeadObject` を打ち、metadata の UUID で移動か新規かを判定する

## media-object

- `findAllSummaries`: 登録済みの id・key・etag を全件返す。同期が R2 の一覧と突き合わせるための射影で、本文の列は読まない。
- `findById`: id で 1 件返す。ゴミ箱に入れたものも返す。
- `findPage`: 新着順の keyset pagination。ゴミ箱に入れたものは除外する。
- `findWithoutThumbnail`: サムネイルが未生成のメディアを返す。処理中のものと、回数を使い切ったものは対象から外す。
- `markThumbnailEnqueued`: サムネイル生成を queue へ投入したことを記録し、試行回数を進める。
- `setThumbnail`: 生成したサムネイルの所在と、併せて読めた寸法・尺を記録する。
- `insertMany` / `relocateMany` / `refreshMany` / `touchMany` / `deleteByIds`: 同期が差分を反映するための書き込み。

ゴミ箱は `trashedAt` のフラグだけで表し、R2 の実体は消しません。`findPage` が `trashedAt IS NULL` で絞ることで、管理ツールからの参照だけが消えます。

## media-sync-run

同期 1 回分の実行記録です。画面の進捗表示と、実行中の同期を二重に起動しない判定に使います。

- `start` / `updateProgress` / `finish`: 実行の記録。`finish` に `error` を渡すと失敗として残ります。
- `findLatest`: 直近の実行。画面が進捗を読む先。
- `findRunning`: 終了していない実行のうち最も古いものを返す。同時に始まった実行のどちらが先かを決めるため、`startedAt` ではなく DB が採る `createdAt` で並べる。

## テスト

integration test は `TEST_DATABASE_URL` が設定されている場合のみ実行されます。
`findLatest` と `findRunning` は全件から探すため、テストは実データより後ろの日時を使ってテスト行が必ず最新になるようにしています。
