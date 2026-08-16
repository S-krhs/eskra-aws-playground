// In scope: GachaEntity repository の入出力型とレアリティ定義
// Out of scope: validation schema、DB 操作、抽選、メッセージ生成
import type { GachaPoolKey } from "../shared/literals/gacha-pool-key.js";

/** ガチャ候補のレアリティ。 */
export const GACHA_RARITIES = ["COMMON", "RARE"] as const;

/** レアリティとして取り得る値。 */
export type GachaRarity = (typeof GACHA_RARITIES)[number];

/** pool に属するガチャ候補。 */
export interface GachaEntity {
	rarity: GachaRarity;
	name: string;
}

/** ガチャ候補の取得入力。 */
export interface FindGachaEntitiesInput {
	poolKey: GachaPoolKey;
}
