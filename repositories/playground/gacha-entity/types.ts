// In scope: the input/output types of the GachaEntity repository
// Out of scope: validation schemas, DB access, drawing, message assembly
import type { GachaPoolKey } from "../shared/literals/gacha-pool-key.js";
import type { GachaRarity } from "../shared/literals/gacha-rarity.js";

/** One gacha candidate belonging to a pool. */
export interface GachaEntity {
	rarity: GachaRarity;
	name: string;
}

export interface FindGachaEntitiesInput {
	poolKey: GachaPoolKey;
}
