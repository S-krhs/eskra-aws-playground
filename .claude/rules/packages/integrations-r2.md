---
paths:
  - "packages/integrations/r2/**"
---

# R2 Integration

Cloudflare R2 との通信境界です。公開 API は `src/r2-client.ts`・`src/r2-object-types.ts`・`src/r2-object-store.ts` に限定します。

- 公開型は `r2-object-types.ts`、操作は `r2-object-store.ts` の `r2ObjectStore` にまとめる。`repositories` の repository と同じ形にして、操作を loose な関数として並べない。
- R2 は S3 互換のため `@aws-sdk/client-s3` を使う。endpoint はアカウント ID から組み立て、region は `auto` を渡す。
- 認証情報と bucket 名は呼び出し側が解決して引数で渡す。env var や設定ファイルをこの package から読まない。
- client は `requestChecksumCalculation` と `responseChecksumValidation` を `WHEN_REQUIRED` にする。AWS SDK の既定（`WHEN_SUPPORTED`）は R2 が解釈しない checksum header を送るため、既定のままにしない。
- 鍵の中身はエラーメッセージやログへ出さない。検証失敗は項目名だけを示すエラーへ変換する。
- key の組み立て、論理パスの解釈、サムネイル生成、DB への反映は置かない。オブジェクト操作の wire 解釈だけを担当する。
- ETag は応答の引用符を外して返す。呼び出し側が同一性の比較で引用符を意識しないようにする。
- `CopySource` は key の "/" を path 区切りとして残し、それ以外を encode する。日本語のフォルダ名がそのままでは通らない。
- `copy` は metadata を渡したときだけ `MetadataDirective: REPLACE` にする。既定は複製元の metadata を引き継ぐ挙動で、移動で UUID を落とさないため。
- 単発の `CopyObject` は 5GB までとする。それを超えるものが必要になったら multipart copy を別の関数として足す。
