// In scope: 遊技チェックリマインダーの質問文・選択肢・回答結果文を定義する
// Out of scope: メッセージ生成、押下結果の判定、Discord payload 生成、外部送信を行う
import type { ButtonTone } from "./button-tone.js";

/** 遊技チェックリマインダーの質問文。 */
export const REMINDER_QUESTION = "やおよろ～！今日は遊技した？";

/** 遊技チェックリマインダーの選択肢。 */
export interface ReminderChoice {
	id: string;
	label: string;
	tone: ButtonTone;
	responseMessage: string;
}

/** 遊技チェックリマインダーの選択肢一覧。 */
export const REMINDER_CHOICES: readonly ReminderChoice[] = [
	{
		id: "won",
		label: "はい（勝った）",
		tone: "positive",
		responseMessage: "∈₍ ᐢ._.ᐢ₎ < やるじゃねぇか まぐれに頼る天才だな",
	},
	{
		id: "lost",
		label: "はい（負けた）",
		tone: "negative",
		responseMessage: "養分乙",
	},
	{
		id: "not-played",
		label: "いいえ",
		tone: "neutral",
		responseMessage: "今日は遊技なし！めでたしめでたし～",
	},
];
