// In scope: UMA ワンドロのお題メッセージを生成する
// Out of scope: Discord payload 生成、外部送信、Lambda レスポンス作成を行う
import { GachaPool } from "@lambda-batch-playground/libs/gacha/gacha-pool.js";
import { topicEntryRepository } from "@lambda-batch-playground/repositories/playground/topic-entry.repository.js";
import {
	TOPIC_RARITIES,
	type TopicEntry,
} from "@lambda-batch-playground/repositories/playground/types.js";
import {
	TOPIC_MESSAGE_TEMPLATE,
	TOPIC_RARITY_WEIGHTS,
} from "./topic-settings.js";

/** UMA ワンドロのお題メッセージ。 */
export interface TopicMessage {
	content: string;
}

const selectTopicName = (): string => {
	const gacha = new GachaPool<TopicEntry>({
		rarities: TOPIC_RARITIES,
		rarityWeights: TOPIC_RARITY_WEIGHTS,
	});

	const topicEntries = topicEntryRepository.findMany();
	gacha.addEntries(topicEntries);

	return gacha.draw().name;
};

/** UMA ワンドロのお題通知に使うメッセージ本文を生成する。 */
export const buildTopicMessage = (): TopicMessage => {
	const messageTemplate = TOPIC_MESSAGE_TEMPLATE;
	const selectedName = selectTopicName();

	if (!selectedName || !messageTemplate) {
		throw new Error("選択されたお題が不正です");
	}

	return {
		content: messageTemplate.replace("{{selectedName}}", selectedName),
	};
};
