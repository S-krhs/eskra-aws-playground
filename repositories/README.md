# Repositories

複数 app から参照するデータと、そのデータアクセスを隠蔽する repository を置く領域です。
静的データ、DB、外部ストレージのどれを使うかは repository 内に閉じ込め、app からは repository の公開 API 経由で扱います。

## 方針

- 実行ロジック、parser、通知送信、Lambda イベント解釈は置かない。
- app から DB client、connection string、SQL、テーブル行構造を直接扱わせない。
- app 固有の一時設定ではなく、共有して管理する価値があるデータだけを扱う。
- 静的データから DB や外部ストレージへ移す場合も、app 側の呼び出し境界を変えず repository 内で吸収する。

## DB

静的データ(`data.ts`)と DB は repository の内側で共存し、公開 API からはどちらを使っているか見えないようにします。

- `db/`: Prisma Client の生成と接続の再利用。schema は `migration/schema.prisma`、生成コマンドは root の `npm run db:generate`。
- `generated/`: `prisma generate` の出力(Prisma Client / Zod schema)。git 管理せず、`postinstall` で再生成される。
- `db/` と `generated/` は package.json の exports に含めない。app からの import は解決エラーになり、この性質を境界の強制に使う。
- 接続先は env var 契約とする。runtime は `DATABASE_URL`(pooled)だけを読み、SST や app 側の resolver には依存しない。
- insert 前の row validation には `generated/zod` の schema を使う。生成 schema と Prisma の型は repository の公開 API(引数・戻り値)に露出しない。
- 実 DB を使う integration test は `TEST_DATABASE_URL`(ローカル用 Neon branch)が設定されている場合のみ実行される。
