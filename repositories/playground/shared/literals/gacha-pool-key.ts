// In scope: the poolKey identifying which pool a gacha candidate belongs to
// Out of scope: defining candidates, drawing, DB access

/** poolKey on GachaEntity. */
export const gachaPoolKeys = {
	umaOneDrawTopic: "uma-one-draw-topic",
} as const;

export type GachaPoolKey = (typeof gachaPoolKeys)[keyof typeof gachaPoolKeys];
