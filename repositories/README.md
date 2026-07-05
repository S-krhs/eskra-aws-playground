# Repositories

複数 app から参照するデータと、そのデータアクセスを隠蔽する repository を置く領域です。
静的データ、DB、外部ストレージのどれを使うかは repository 内に閉じ込め、app からは repository の公開 API 経由で扱います。

## 方針

- 実行ロジック、parser、通知送信、Lambda イベント解釈は置かない。
- app から DB client、connection string、SQL、テーブル行構造を直接扱わせない。
- app 固有の一時設定ではなく、共有して管理する価値があるデータだけを扱う。
- 静的データから DB や外部ストレージへ移す場合も、app 側の呼び出し境界を変えず repository 内で吸収する。
