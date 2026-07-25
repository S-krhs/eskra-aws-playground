---
paths:
  - "apps/function-url-playground/**"
---

# Function URL Playground

Discord interaction を受ける Lambda Function URL の公開エンドポイント app です。`infra/sst.config.ts` が `url: true` の Lambda(`FunctionUrlFunction`)として定義します。handler は 1 つ(`src/handlers/handler.ts`)で、リクエストパス(`rawPath`)で Bot ごとの route を振り分けます。DB・repositories には接続せず、実処理は SQS 経由で `batch-playground` の `sqs-worker` へ渡します。

## Interaction の応答方式

Discord interaction は 3 秒以内に応答しないと失敗するため、確定応答を作らず deferred で ACK し、実処理は SQS の後追いジョブへ渡します。

- application command は deferred message(type 5。ephemeral にする場合のみ `flags` を付ける)、message component は deferred update(type 6)で ACK する。
- deferred type を持たない PING と autocomplete は、その場で確定応答を返す。DB も外部通信も伴わない入力検証エラーも即時応答でよい。
- 確定メッセージの生成・送信は行わない。`sqs-worker`(batch-playground)が interaction token で元メッセージを差し替える。
- interaction token は 15 分で失効する。enqueue する後追いジョブのリトライはこの範囲に収める。

## 層と責務

| 層 | 置くもの | 置かないもの |
| --- | --- | --- |
| `src/handlers/handler.ts` | Lambda エントリポイント、request envelope 検証、path から route への解決と委譲 | route 固有の詳細 parse、業務ロジック |
| `src/handlers/contracts/paths.ts` | 公開する path の一元管理 | route の実装 |
| `src/handlers/routes/<route>/route.ts` | request envelope の parse、認証・認可、interaction type から operation への振り分け、HTTP response の形成 | Discord interaction body の parse、payload 構築、type 固有のオーケストレーション |
| `src/handlers/routes/<route>/operations/` | interaction type 固有のオーケストレーション、integration・shared-domains 呼び出し、後追いジョブ message の組み立てと enqueue、deferred ack の生成 | route の選択、署名検証、HTTP response の形成、別 operation の呼び出し、確定メッセージの生成、DB アクセス |
| `src/handlers/routes/<route>/contracts/` | その Bot のスラッシュコマンド契約(`commands.ts`。CD が deploy 後に global scope へ同期) | コマンドの実行処理 |
| `src/handlers/routes/intermediate-models/` | operation 結果の中間表現(`operation-result.ts`) | HTTP response の形成、operation の実装 |
| `src/handlers/schema.ts` | Function URL event 検証 schema と応答型 | ルート判定、外部サービス固有の型 |
| `src/scripts/` | `sst shell` 経由で実行する運用スクリプト(`sync-discord-commands.ts`) | Lambda から呼ばれる処理 |
| `sst-resource-links.d.ts`(package root) | SST link した secret を `Resource` proxy 経由で型付き参照するための declaration | 実行時の値解決 |

Discord の parse・署名検証・応答型は `@eskra-aws-playground/integration-discord`、custom_id 規約・prefix・interaction ジョブの job 名 / message schema は `@eskra-aws-playground/shared-domains`、後追いジョブの enqueue は `@eskra-aws-playground/integration-sqs` を使う。

## 依存方向

```text
handler -> routes -> operations -> integration-discord / integration-sqs / shared-domains
routes -> integration-discord(署名検証・応答型)
routes -> shared-domains(custom_id codec・prefix)
```

- route から feature を直接呼び出さない。この app は feature を持たず、operation が integration・shared-domains を組み合わせる。依存方向は必ず `route -> operation` とする。
- DB・repositories には依存しない。実処理が DB を要するものは message を enqueue し `sqs-worker` に委ねる。

## 実装ルール

- 公開 path は `contracts/paths.ts` に追加し、`handler.ts` の `routesByPath` へ登録する。対応しない path は 404 を返す。
- route は Discord application の public key で Ed25519 署名を検証する(integration-discord の `verify-interaction-signature`)。不正は 401。public key は `Resource.<Bot>DiscordInteractionPublicKey.value` から解決する。
- interaction body の parse は integration-discord の `parse-interaction` / `parse-interaction-callback` を使う。custom_id は生文字列で受け取り、規約(`prefix:target:action`)の解釈は shared-domains の `parseCustomId` で行う。
- operation は `routes/<route>/operations/<operation>-operation.ts` に置き、1 ファイルにつき 1 メソッドとする。定数結果を返すだけの薄い operation は作らず、route の振り分けへインライン化する。
- operation から enqueue するときは message を `InteractionJobMessage`(shared-domains)として宣言してから `SqsMessageSender` へ渡す。`SqsMessageInput` の `body` は `unknown` のため、型注釈がないと契約違反を検出できない。message には interaction token を載せるため、ログや `details` へ出さない。
- enqueue の失敗は deferred 応答を返せないため、その場で確定する ephemeral 応答へ落とす。
- スラッシュコマンドを追加・変更したら該当 route の `contracts/commands.ts` を更新する。global scope への同期は `sync-discord-commands.ts`(root の `npm run discord:sync` / `discord:sync:dry`)で行う。
- linked secret は `Resource.<name>.value` を直接読み、型は `sst-resource-links.d.ts` に宣言を追加する。
- `details` と開始/終了ログには調査に役立つ安全な値だけを入れ、設定不足・入力不備・外部 API 失敗はエラーメッセージで区別できるようにする。
- Bot / route を追加したら、app `README.md` の path 表と secret を更新する。
