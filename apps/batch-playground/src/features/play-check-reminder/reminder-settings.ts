// In scope: 遊技チェックリマインダーの質問文・選択肢・custom_id 形式の設定値を定義する
// Out of scope: メッセージ生成、押下結果の判定、Discord payload 生成、外部送信を行う

/** 遊技チェックリマインダーの質問文。 */
export const REMINDER_QUESTION = "今日は遊技をしましたか？";

/** 選択肢メッセージの custom_id prefix。残りの形式は Discord protocol が構築する。 */
export const REMINDER_CUSTOM_ID_PREFIX = "play-check-reminder";

/** 選択肢ボタンを利用者へどう見せるかを表す意味的なtone。 */
export type ReminderChoiceTone = "positive" | "negative" | "neutral";

/** 遊技チェックリマインダーの選択肢。 */
export interface ReminderChoice {
	id: string;
	label: string;
	tone: ReminderChoiceTone;
}

/** 遊技チェックリマインダーの選択肢一覧。 */
export const REMINDER_CHOICES: readonly ReminderChoice[] = [
	{ id: "won", label: "はい（勝った）", tone: "positive" },
	{ id: "lost", label: "はい（負けた）", tone: "negative" },
	{ id: "not-played", label: "いいえ", tone: "neutral" },
];
