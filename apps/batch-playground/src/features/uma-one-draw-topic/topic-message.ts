// In scope: writing the UMA one-draw topic message
// Out of scope: building the Discord payload, sending, assembling the Lambda response
import { GachaPool } from "@eskra-aws-playground/libs/gacha/gacha-pool.js";
import { gachaPoolKeys } from "@eskra-aws-playground/repositories/playground/_shared/literals/gacha-pool-key.js";
import { gachaRarities } from "@eskra-aws-playground/repositories/playground/_shared/literals/gacha-rarity.js";
import { gachaEntityRepository } from "@eskra-aws-playground/repositories/playground/gacha-entity/repository.js";
import type { GachaEntity } from "@eskra-aws-playground/repositories/playground/gacha-entity/types.js";
import {
	TOPIC_MESSAGE_TEMPLATE,
	TOPIC_RARITY_WEIGHTS,
} from "./topic-settings.js";

export interface TopicMessage {
	content: string;
}

const selectTopicName = async (): Promise<string> => {
	const gacha = new GachaPool<GachaEntity>({
		rarities: Object.values(gachaRarities),
		rarityWeights: TOPIC_RARITY_WEIGHTS,
	});

	const topicEntities = await gachaEntityRepository.findMany({
		poolKey: gachaPoolKeys.umaOneDrawTopic,
	});
	gacha.addEntries(topicEntities);

	return gacha.draw().name;
};

export const buildTopicMessage = async (): Promise<TopicMessage> => {
	const messageTemplate = TOPIC_MESSAGE_TEMPLATE;
	const selectedName = await selectTopicName();

	if (!selectedName || !messageTemplate) {
		throw new Error("選択されたお題が不正です");
	}

	return {
		content: messageTemplate.replace("{{selectedName}}", selectedName),
	};
};
