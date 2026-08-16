// In scope: ガチャ候補が属する pool を識別する poolKey の定義
// Out of scope: 候補の定義、抽選、DB 操作

/** GachaEntity の poolKey。 */
export const gachaPoolKeys = {
	umaOneDrawTopic: "uma-one-draw-topic",
} as const;

/** poolKey として取り得る値。 */
export type GachaPoolKey = (typeof gachaPoolKeys)[keyof typeof gachaPoolKeys];
