// In scope: UMA ワンドロのお題メッセージを生成する
// Out of scope: Discord payload 生成、外部送信、Lambda レスポンス作成を行う
import { GachaPool } from "@lambda-batch-playground/libs/gacha/gacha-pool.js";
import {
	UMA_ONE_DRAW_TOPIC_ENTRIES,
	UMA_ONE_DRAW_TOPIC_MESSAGE_TEMPLATE,
	UMA_ONE_DRAW_TOPIC_RARITIES,
	UMA_ONE_DRAW_TOPIC_RARITY_WEIGHTS,
	type UmaOneDrawTopicEntry,
} from "./topic-settings.js";

/** UMA ワンドロのお題メッセージ。 */
export interface UmaOneDrawTopicMessage {
	content: string;
}

const selectTopicName = (): string => {
	const gacha = new GachaPool<UmaOneDrawTopicEntry>({
		rarities: UMA_ONE_DRAW_TOPIC_RARITIES,
		rarityWeights: UMA_ONE_DRAW_TOPIC_RARITY_WEIGHTS,
	});

	gacha.addEntries(UMA_ONE_DRAW_TOPIC_ENTRIES);

	return gacha.draw().name;
};

/** UMA ワンドロのお題通知に使うメッセージ本文を生成する。 */
export const buildUmaOneDrawTopicMessage = (): UmaOneDrawTopicMessage => {
	const messageTemplate = UMA_ONE_DRAW_TOPIC_MESSAGE_TEMPLATE;
	const selectedName = selectTopicName();

	if (!selectedName || !messageTemplate) {
		throw new Error("選択されたお題が不正です");
	}

	return {
		content: messageTemplate.replace("{{selectedName}}", selectedName),
	};
};
