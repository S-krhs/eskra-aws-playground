# Anime Repositories

## data

`data.ts` はアニメ指標スクレイピング対象の静的カタログです。

```json
{
  "id": "my-anime-list-score",
  "websiteName": "MyAnimeList",
  "metricName": "score",
  "higherIsBetter": true,
  "scheduleHourJst": 23,
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

- `higherIsBetter`: 値が大きいほど上位とみなすなら `true`、順位系（値が小さいほど上位）なら `false`。通知のランキング表示の並び順に使う。
- `scheduleHourJst`: この定義をスクレイピングする起動スケジュール。orchestrator が起動時刻ごとに対象を絞り込む。
- `source.type: "api"` は JSON path、`"webpage"` は CSS selector で metric を取り出す。
- ranking のように表示順を値にする場合は `value.type: "item-index"` を使う。
