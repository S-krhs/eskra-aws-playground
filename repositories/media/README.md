# Media Repositories

R2 の key は `{論理パス}/{更新日時}.{拡張子}` で、UUID は含みません。UUID は object の metadata にあり、`MediaObject.id`（= metadata の UUID）と `objectKey` の対応はこの table だけが持ちます。

ゴミ箱は `trashedAt` のフラグだけで表し、R2 の実体は消しません。
