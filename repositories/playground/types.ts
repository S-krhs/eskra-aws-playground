// In scope: repository 由来の UMA ワンドロお題候補の型とレアリティ定義を定義する
// Out of scope: お題選択、メッセージ生成、外部送信を行う

/** UMA ワンドロのお題レアリティ。 */
export const TOPIC_RARITIES = ["COMMON", "RARE"] as const;

/** UMA ワンドロで使うお題レアリティ。 */
export type TopicRarity = (typeof TOPIC_RARITIES)[number];

/** UMA ワンドロのお題候補。 */
export interface TopicEntry {
	rarity: TopicRarity;
	name: string;
}
