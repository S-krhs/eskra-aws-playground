# Anime Repositories

アニメ関連 app で共有する静的データと repository を置きます。

## data

`data.ts` は、アニメ指標スクレイピング対象の静的カタログです。
app の内部型や DB の行構造ではなく、どのサイトからどの指標をどう取り出すかだけを表します。

```json
{
  "id": "my-anime-list-score",
  "websiteName": "MyAnimeList",
  "metricName": "score",
  "scheduleHour": 9,
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

- `scheduleHour` は、この定義をスクレイピングする起動スケジュール（JST の hour）です。orchestrator が起動時刻ごとに対象を絞り込みます。
- `source.type: "api"` は JSON path で metric を取り出します。
- `source.type: "webpage"` は CSS selector で metric を取り出します。
- ranking のように表示順を値にする場合は `value.type: "item-index"` を使います。
