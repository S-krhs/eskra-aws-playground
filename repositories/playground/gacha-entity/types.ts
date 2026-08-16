// In scope: GachaEntity repository の入出力型
// Out of scope: validation schema、DB 操作、抽選、メッセージ生成
import type { GachaPoolKey } from "../shared/literals/gacha-pool-key.js";
import type { GachaRarity } from "../shared/literals/gacha-rarity.js";

/** pool に属するガチャ候補。 */
export interface GachaEntity {
	rarity: GachaRarity;
	name: string;
}

/** ガチャ候補の取得入力。 */
export interface FindGachaEntitiesInput {
	poolKey: GachaPoolKey;
}
