// In scope: the poolKey identifying which pool a gacha candidate belongs to
// Out of scope: defining candidates, drawing, DB access

/** Every candidate shares one table, and the pool it belongs to is what separates them. */
export const gachaPoolKeys = {
	umaOneDrawTopic: "uma-one-draw-topic",
} as const;

export type GachaPoolKey = (typeof gachaPoolKeys)[keyof typeof gachaPoolKeys];
