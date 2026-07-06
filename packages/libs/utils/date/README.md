# Date

日付・時刻の汎用処理を置きます。内部では dayjs を使い、タイムゾーン(JST)の時差吸収はこのディレクトリに閉じます。

## Public API

- `current-jst-date.ts`: JST 基準の現在日付を YYYY-MM-DD 形式で返す。
