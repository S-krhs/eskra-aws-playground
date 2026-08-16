// In scope: ガチャ候補の当たりやすさを識別する rarity の定義
// Out of scope: 抽選重みの解釈、抽選、DB 操作

/** GachaEntity の rarity。 */
export const gachaRarities = {
	common: "COMMON",
	rare: "RARE",
} as const;

/** rarity として取り得る値。 */
export type GachaRarity = (typeof gachaRarities)[keyof typeof gachaRarities];
