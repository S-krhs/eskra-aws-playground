// In scope: UMA ワンドロのお題メッセージ生成に使う設定値を定義する
// Out of scope: お題候補の定義、お題選択、メッセージ生成、外部送信を行う
import type { TopicRarity } from "@lambda-batch-playground/repositories/playground/types.js";

/** UMA ワンドロのお題レアリティごとの重み。 */
export const TOPIC_RARITY_WEIGHTS: Readonly<Record<TopicRarity, number>> = {
	COMMON: 9,
	RARE: 1,
};

/** UMA ワンドロのお題メッセージテンプレート。 */
export const TOPIC_MESSAGE_TEMPLATE =
	"本日のお題は {{selectedName}} になります";
