# Anime Repositories

アニメ関連 app で共有する静的データと repository を置きます。

## data

`data.ts` は、アニメ指標スクレイピング対象の静的カタログです。
app の内部型や DB の行構造ではなく、どのサイトからどの指標をどう取り出すかだけを表します。

```json
{
  "id": "my-anime-list-top-anime-score",
  "websiteName": "MyAnimeList",
  "metricName": "score",
  "timeframe": "all-time",
  "source": {
    "type": "api",
    "url": "https://example.com/api",
    "itemsPath": "data",
    "labelPath": "title",
    "value": {
      "type": "path",
      "path": "score"
    }
  }
}
```

- `source.type: "api"` は JSON path で metric を取り出します。
- `source.type: "webpage"` は CSS selector で metric を取り出します。
- ranking のように表示順を値にする場合は `value.type: "item-index"` を使います。
