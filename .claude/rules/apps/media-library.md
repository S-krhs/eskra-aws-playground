---
paths:
  - "apps/media-library/**"
---

# Media Library

WSL に常駐し、R2 に置いたメディアをブラウザから見て整理するローカルツールです。利用者向けの説明は `apps/media-library/README.md`、常駐と PWA 登録の手順は `docs/media-library-app.md` にあります。

**この app はデプロイしません。** `infra/sst.config.ts` には登場せず、実行するのは利用者の WSL だけです。同期そのものは `batch-playground` の Lambda が担当し、この app は起動を依頼して進捗を読むだけです。

## 構成

```text
backend/src/    Hono。API と画面の配信を 1 プロセスで兼ねる
frontend/src/   React。Vite でビルドし、成果物を backend が配信する
```

- **backend の相対 import に `@/` エイリアスを使わない。** 他の app は bundler がパスを解決するが、この backend は `node backend/dist/server.js` で直接起動するため、`tsconfig` の `paths` は実行時に解決されない。
- frontend は `@/`(自身の `src`)と `@backend/`(backend の `src`、型のみ)を使う。Vite と vitest の alias に両方を登録する。
- frontend のレスポンス型は手で書かず、`hc<ApiType>()` と `InferResponseType` で backend の route 定義から導出する。backend の値を frontend へ import しない(型だけにする)。

## frontend のディレクトリ構成(Feature-Sliced Design)

`frontend/src/` は Feature-Sliced Design の層で分けます。ルーターを持たない 1 画面の SPA なので、画面の組み立ては `pages/media-library` に置き、React の起動だけを `app/` に置きます。

```text
app/main.tsx                          React の起動と style の読み込み
pages/media-library/                  1 画面の組み立て(ui)
features/media-filter/                絞り込みの操作(ui)
features/media-grid/                  一覧の取得と仮想スクロール(ui・model)
features/sync-control/                同期の起動と進捗(ui・model)
entities/media/                       MediaFilter(model)
shared/api/                           backend の API client
shared/lib/                           表記の整形
shared/styles/index.css               Tailwind の入口
```

- slice は `ui/`(描画)・`model/`(業務上の判断や語彙を含む型・データ・hook)・`lib/`(業務上の判断を含まない変換・整形)の segment に分ける。必要な segment だけ作る。
- import は下の層へだけ流す。`app → pages → features → entities → shared` の順で、逆流させない。同じ層の slice 同士も import しない。
- **feature をまたいで使う型は entities へ上げる。** 絞り込み条件は絞り込みの feature と一覧の feature の両方が扱うため `entities/media` に置く。ここを怠ると feature 間 import になる。
- **層は上から順に作らない。実際に再利用される段になってから足す。** widget は作っていない。複数の画面に載る塊が出てから足す。
- slice と `shared` の segment には public API として `index.ts` を置き、外からはそこだけを import する(`@/features/media-grid`、`@/shared/api`)。共通ルールのバレルファイル禁止に対する、この app 限定の例外。
- slice の内側は相対 import で書く(`../model/use-media-page.js`)。slice をまたぐときだけ alias で public API を指す。import を見ただけで slice の内か外かが分かるようにする。
- `.ts` / `.tsx` をファイル名まで指すときは `.js` 拡張子を付ける。public API を指すときだけ拡張子なしで、ディレクトリの `index.ts` に解決される。

## lint

`npm run lint` は `biome ci .` と `steiger ./frontend/src` を続けて実行します。FSD 違反は CI で落ちます。

- steiger の設定は `steiger.config.js` に置く。`.ts` にすると cosmiconfig の TypeScript loader が repo の TypeScript 7 に未対応で落ちる。
- `fsd/insignificant-slice` は app 全体で off。画面が 1 つしかないため、どの slice も参照が 1 件になり全件が指摘される。`files` で範囲を絞ると、その範囲のファイルが参照元として数えられなくなり `entities/media` まで「参照 1 件」に見えるため、範囲を絞らず切っている。**2 つ目の画面を足したらこの無効化を外し、指摘が消えることを確かめる。**
- 上記以外は無効化しない。層をまたぐ誤りを捕まえる `fsd/forbidden-imports`、public API を迂回した import を捕まえる `fsd/no-public-api-sidestep`、public API の欠落を捕まえる `fsd/public-api` は特に残す。
- Tailwind の class 順は `biome.json` の override で `useSortedClasses` を有効にしている(`static-site-playground` と同じ)。unsafe fix 扱いのため `biome check --write` では当たらない。`biome check --write --unsafe apps/media-library/frontend/src` を使う。

## 実装ルール

- API は `/api` 配下に置く。残りの経路は `index.html` へ落とすため、名前空間を分けないと画面の経路と衝突する。
- 入力の検証は route の中で zod の `safeParse` で行い、失敗は 400 で返す。エラーメッセージには項目名だけを載せ、渡された値を含めない。
- 認証情報・接続文字列・R2 の key を応答へ出さない。一覧が返すのは `MediaView` に絞った項目だけで、`objectKey` と `thumbnailKey` は含めない。
- 例外の詳細は `onError` で手元のログにだけ残し、応答は定型のメッセージにする。
- 設定は `~/.config/eskra-media-library/config.json` から読む。場所の決め方は `shared-domains` の `media-library-config` にあり、アップローダと同じファイルを共有する。
- `repositories` は `DATABASE_URL` から接続先を読む。route が動く前に `server.ts` で設定値を入れる。
- **接続先と client は module スコープに持ち、getter で参照する。** route を factory にして context を引き回さない。`repositories/db/client.ts` の `getPrismaClient` と同じ形で、設定は `getLibrarySettings`、R2 client は `getR2Client` から取る。route は `new Hono()` の値として export し、`app.ts` が `route()` で繋ぐ。
- 同期の起動は Lambda の非同期 invoke で行い、完了を待たない。二重起動は同期 job 側が実行中の記録を見て弾くため、この app では抑止しない。
- サムネイルはローカルへキャッシュする。書き込み途中のファイルを次の要求が読まないよう、別名で書いてから rename する。
- サムネイルの id はそのままファイル名になる。R2 や DB を引く前に UUID として検証する。
- 待ち受けは `127.0.0.1` に固定する。他端末から見せる判断が要るまで外へ開かない。
- ポートを掴めなかった場合は既に起動しているとみなして終了コード 0 で終わる。常駐の再実行で二重に立ち上げない。

## 層と責務

| 層 | 置くもの | 置かないもの |
| --- | --- | --- |
| `backend/src/server.ts` | 設定の読み込み、client の生成、待ち受けの開始と失敗時の扱い | route の実装、業務ロジック |
| `backend/src/app.ts` | route の合成、静的ファイルの配信、共通のエラー応答 | 個々の route の実装、DB や R2 の呼び出し |
| `backend/src/routes/` | HTTP の入出力、入力検証、repository と integration の呼び出し | ファイル操作、外部サービスの wire 解釈 |
| `backend/src/routes/intermediate-models/` | 応答用の型と、repository の型からの変換 | DB の query、HTTP status の決定 |
| `backend/src/features/<concern>/` | キャッシュや Lambda 起動など、route から切り出した処理 | HTTP の解釈、応答の組み立て |
| `backend/src/shared/` | 設定の読み込みと、プロセス内で使い回す client の生成 | 業務ロジック、route の実装 |
| `frontend/src/app/` | React の起動、全体に効く style の読み込み | 画面の実装、機能の実装 |
| `frontend/src/pages/` | 画面の組み立てと、画面が持つ状態 | 機能の実装、API の呼び出し |
| `frontend/src/features/<concern>/` | 機能単位の hook と表示 | 画面の組み立て、別 feature の実装 |
| `frontend/src/entities/` | 複数の feature が扱う対象の型 | 1 つの feature でしか使わない型 |
| `frontend/src/shared/` | API client と表記の整形 | 画面の状態管理、機能固有の処理 |
