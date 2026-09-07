// In scope: the settings used to write the UMA one-draw topic message
// Out of scope: defining the topic candidates, drawing one, writing the message, sending
import type { GachaRarity } from "@eskra-aws-playground/repositories/playground/shared/literals/gacha-rarity.js";

/** Draw weight per topic rarity. */
export const TOPIC_RARITY_WEIGHTS: Readonly<Record<GachaRarity, number>> = {
	COMMON: 9,
	RARE: 1,
};

/** The topic message template. */
export const TOPIC_MESSAGE_TEMPLATE =
	"本日のお題は {{selectedName}} になります";
