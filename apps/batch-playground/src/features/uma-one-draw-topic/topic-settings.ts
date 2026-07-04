// In scope: UMA ワンドロのお題メッセージ生成に使う設定値を定義する
// Out of scope: お題選択、メッセージ生成、外部送信を行う
/** UMA ワンドロのお題レアリティ。 */
export const UMA_ONE_DRAW_TOPIC_RARITIES = ["COMMON", "RARE"] as const;

/** UMA ワンドロで使うお題レアリティ。 */
type UmaOneDrawTopicRarity = (typeof UMA_ONE_DRAW_TOPIC_RARITIES)[number];

/** UMA ワンドロのお題レアリティごとの重み。 */
export const UMA_ONE_DRAW_TOPIC_RARITY_WEIGHTS: Readonly<
	Record<UmaOneDrawTopicRarity, number>
> = {
	COMMON: 9,
	RARE: 1,
};

/** UMA ワンドロのお題候補。 */
export interface UmaOneDrawTopicEntry {
	rarity: UmaOneDrawTopicRarity;
	name: string;
}
export const UMA_ONE_DRAW_TOPIC_ENTRIES: readonly UmaOneDrawTopicEntry[] = [
	{ rarity: "COMMON", name: "ホッコータルマエ" },
	{ rarity: "RARE", name: "ダイワスカーレット" },
	{ rarity: "RARE", name: "アーモンドアイ" },
	{ rarity: "RARE", name: "サトノダイヤモンド" },
	{ rarity: "RARE", name: "ナリタトップロード" },
];

/** UMA ワンドロのお題メッセージテンプレート。 */
export const UMA_ONE_DRAW_TOPIC_MESSAGE_TEMPLATE =
	"本日のお題は {{selectedName}} になります";
