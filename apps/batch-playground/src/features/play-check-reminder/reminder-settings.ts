// In scope: 遊技チェックリマインダーの質問文・選択肢を定義する
// Out of scope: メッセージ生成、押下結果の判定、Discord payload 生成、外部送信を行う
import type { DiscordButtonTone } from "@/external-protocols/discord-message/button.js";

/** 遊技チェックリマインダーの質問文。 */
export const REMINDER_QUESTION = "やおよろ～！今日は遊技した？";

/** 遊技チェックリマインダーの選択肢。 */
export interface ReminderChoice {
	id: string;
	label: string;
	tone: DiscordButtonTone;
}

/** 遊技チェックリマインダーの選択肢一覧。 */
export const REMINDER_CHOICES: readonly ReminderChoice[] = [
	{ id: "won", label: "はい（勝った）", tone: "positive" },
	{ id: "lost", label: "はい（負けた）", tone: "negative" },
	{ id: "not-played", label: "いいえ", tone: "neutral" },
];
