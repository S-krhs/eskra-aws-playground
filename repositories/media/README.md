# Media Repositories

R2 の key は `{論理パス}/{更新日時}.{拡張子}` で、UUID は含みません。UUID は object の metadata にあり、`MediaObject.id`（= metadata の UUID）と `objectKey` の対応はこの table だけが持ちます。

論理パスのうち先頭が `_` のものは仕分け先ではなく状態を表します。

| prefix | 意味 |
| --- | --- |
| `_pending` | アップロード直後。サムネイルがまだ無い |
| `_inbox` | サムネイルができた。まだ仕分けていない |
| `_failed` | サムネイル生成を打ち切った |
| `_thumb` | サムネイル本体。`{UUID}.webp` で論理パスを含まない |

`media-storage` は R2 の object 操作、`media-object` は DB の行、`media-sync-run` は同期 1 回分の記録を持ちます。R2 の client と bucket 名は `client/r2.ts` の中に閉じており、app からは見えません。

ゴミ箱は `trashedAt` のフラグだけで表し、R2 の実体は消しません。
