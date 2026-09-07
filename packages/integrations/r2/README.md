# R2 Integration

Cloudflare R2 のオブジェクトストレージとの通信境界を担当する integration package です。
R2 は S3 互換 API を提供するため `@aws-sdk/client-s3` を使います。

## Public API

- `src/r2-client.ts`
  - `createR2Client`: 認証情報からアカウント固有の endpoint へ繋ぐ client を作る。
  - `parseR2Credentials`: 未検証の値を R2 の認証情報へ検証・変換する。
  - `R2Credentials` / `R2Client`: 認証情報と、オブジェクト操作へ引き回す client。
- `src/r2-object-store.ts`
  - `listObjects` / `headObject` / `headObjectIfExists` / `getObject` / `uploadObject` / `copyObject` / `deleteObject`: オブジェクト操作。
  - `headObjectIfExists` は存在しない key で undefined を返す。key の衝突判定に使う。
  - `buildCopySource`: CopyObject へ渡す複製元の組み立て。
  - `R2ObjectSummary` / `R2ObjectMetadata` / `R2ObjectBody`: 応答の公開型。

## 責務

- R2 の endpoint 解決、認証、オブジェクト操作の wire 解釈を扱う。
- 認証情報の取得元の解決（設定ファイルか SST secret か）、bucket 名の決定、key の組み立て、サムネイル生成、DB への反映は扱わない。認証情報と bucket は呼び出し側が解決して渡す。

## 前提

- API トークンは対象 bucket の Object Read & Write に絞ったものを使います。
- client は `requestChecksumCalculation` と `responseChecksumValidation` を `WHEN_REQUIRED` に落としています。AWS SDK の既定（`WHEN_SUPPORTED`）は R2 が解釈しない checksum header を送るためです。
- `copyObject` は単発の CopyObject で、5GB を超えるオブジェクトには使えません。超えるものは multipart copy が必要です。
- `getObject` の `range` には HTTP の Range ヘッダをそのまま渡せます。応答が部分応答なら `isPartial` が真になり、`contentRange` に Content-Range が入ります。
