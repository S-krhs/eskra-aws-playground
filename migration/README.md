# Migration

Prisma schema と migration history を管理する領域です。
npm workspace ではなく、`prisma` CLI(root devDependency)を root の scripts から実行します。
CLI の設定(schema / migrations の場所、接続先の解決)は root の `prisma.config.ts` にあります。

## コマンド(root で実行)

| コマンド | 用途 |
| --- | --- |
| `npm run db:generate` | Prisma Client と Zod schema を `repositories/generated/` へ生成(DB 接続不要。`postinstall` でも実行される) |
| `npm run db:migrate:dev` | schema 変更から migration を作成し、ローカル用 Neon branch へ適用 |
| `npm run db:migrate` | commit 済み migration を適用(CD が develop に対して実行する) |

## 接続文字列の扱い

- `DATABASE_URL`: pooled 接続。runtime(repositories/db)だけが使う。
- `DIRECT_DATABASE_URL`: direct 接続。migrate 系コマンドだけが使う(`prisma.config.ts` で解決)。CD では migration step の env にだけ渡し、他の step へ漏らさない。
- ローカルは root `.env` に **ローカル用 Neon branch** の値を入れる(`.env.example` 参照)。develop 用の値を手元に置かない。

## ルール

- Neon console で schema や table を作成・変更しない。schema 作成(`CREATE SCHEMA`)も含めて、すべて Prisma migration で行う(console は SELECT などの読み取りのみ)。
- 破壊的 migration(column の drop / rename / 型変更)を含む PR は、その旨を PR 本文に明記しレビュー承認を必須とする。
- rollback は forward-only とする。打ち消したい場合は逆向きの migration を新規作成する。
- データの backfill は migration に書かない。一回きりの import は手順書に残し、継続的なものは batch app にする。

## 一回きりの import 手順

- [Scraping Metrics Backfill](./docs/backfill/scraping-metrics.md)
