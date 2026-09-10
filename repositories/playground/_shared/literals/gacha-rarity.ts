// In scope: the rarity identifying how likely a gacha candidate is to be drawn
// Out of scope: interpreting draw weights, drawing, DB access

export const gachaRarities = {
	common: "COMMON",
	rare: "RARE",
} as const;

export type GachaRarity = (typeof gachaRarities)[keyof typeof gachaRarities];
