// In scope: sqs-worker が受け付ける interaction ジョブ名を一元管理する
// Out of scope: ジョブの実装、SQS message の構築、ルーティングを持つ

/** deferred 応答済み interaction を後追い処理する SQS ジョブ名。 */
export const interactionJobNames = {
	yacchoHelloReply: "yaccho-hello-reply",
	kaguyaInuihiroshiReply: "kaguya-inuihiroshi-reply",
	gambleCheckEnable: "gamble-check-enable",
	gambleCheckDisable: "gamble-check-disable",
	playCheckReminderChoice: "play-check-reminder-choice",
} as const;
