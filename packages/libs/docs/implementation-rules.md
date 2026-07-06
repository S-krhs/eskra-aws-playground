# Libs 実装ルール

- 汎用処理は `packages/libs/utils` に置く。dayjs のような軽量な npm 依存は持てる。
- browser 実行など重いライブラリ依存が必要な処理は `packages/libs/browser` に置く。
- `gacha`、`string`、`date`、`array` など処理の関心でディレクトリを切る。
- `index.ts` とバレルファイルは作らない。
- integration や app の都合が混ざり始めた場合は境界を見直す。DI は複雑さを減らす具体的な理由がある場合だけ使う。
- 新しい lib を追加する前に、この package の `docs/architecture.md` と `docs/implementation-rules.md` を読み、配置・依存方向・公開方法を確認する。
- 1 ファイルに型、検証、選択アルゴリズム、公開 API をまとめない。責務が複数ある場合は、関心ごとにファイルを分ける。
- ファイル先頭コメントを書く場合は、そのファイル固有の責務だけを書く。モジュール全体の説明や仮置きの説明を各ファイルに流用しない。
- 乱数を主目的にする lib では、公開 API の境界でだけ `Math.random` を既定値として閉じ込めてもよい。抽選ロジック本体は `random: () => number` を受け取れる形にして検証可能にする。
