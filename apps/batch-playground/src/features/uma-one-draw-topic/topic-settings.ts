// やること: UMA ワンドロのお題メッセージ生成に使う設定値を定義する
// やらないこと: お題選択、メッセージ生成、外部送信を行う

/** UMA ワンドロのお題候補。 */
export const UMA_ONE_DRAW_TOPIC_NAMES = {
	c: ["ホッコータルマエ"] as string[],
	r: [
		"ダイワスカーレット",
		"アーモンドアイ",
		"サトノダイヤモンド",
		"ナリタトップロード",
	] as string[],
} as const;

/** UMA ワンドロのお題メッセージテンプレート。 */
export const UMA_ONE_DRAW_TOPIC_MESSAGE_TEMPLATE =
	"今日のお題は {{selectedName}} になります";
