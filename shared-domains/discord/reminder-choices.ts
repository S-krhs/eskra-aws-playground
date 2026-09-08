// In scope: defining the play-check reminder's question, choices, and response text
// Out of scope: message assembly, judging which button was pressed, building a Discord payload, sending
import type { ButtonTone } from "./button-tone.js";

export const REMINDER_QUESTION = "やおよろ～！今日は遊技した？";

export interface ReminderChoice {
	id: string;
	label: string;
	tone: ButtonTone;
	responseMessage: string;
}

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
