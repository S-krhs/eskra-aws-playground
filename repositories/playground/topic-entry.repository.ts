// In scope: repository から UMA ワンドロのお題候補を読み込む
// Out of scope: お題選択、メッセージ生成、外部送信を行う
import { topicEntries } from "./data.js";
import type { TopicEntry } from "./types.js";

export const topicEntryRepository = {
	findMany: (): TopicEntry[] => {
		return [...topicEntries];
	},
};
