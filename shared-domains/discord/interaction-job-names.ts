// In scope: the one place listing interaction job names sqs-worker accepts
// Out of scope: job implementation, building an SQS message, routing
export const interactionJobNames = {
	yacchoHelloReply: "yaccho-hello-reply",
	kaguyaInuihiroshiReply: "kaguya-inuihiroshi-reply",
	gambleCheckEnable: "gamble-check-enable",
	gambleCheckDisable: "gamble-check-disable",
	playCheckReminderChoice: "play-check-reminder-choice",
} as const;
