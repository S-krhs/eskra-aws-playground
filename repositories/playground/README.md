# Playground Repositories

playground 関連 app で共有する静的データと repository を置きます。

## data

`data.ts` は、UMA ワンドロのお題候補の静的カタログです。
どのお題がどのレアリティで出るかだけを表し、抽選の重みやメッセージ文面は含めません。

```json
{
  "rarity": "RARE",
  "name": "ダイワスカーレット"
}
```

- `rarity` は `types.ts` の `TOPIC_RARITIES` に含まれる値だけを使います。
- レアリティごとの抽選重みやメッセージテンプレートは、お題候補ではなく feature 側の設定として扱います。
