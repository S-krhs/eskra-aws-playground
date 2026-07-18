// In scope: batch handler が受け付ける job 名を一元管理する
// Out of scope: job の実装、Lambda イベントの解釈、実行スケジュールを持つ

/** Batch Playground app でサポートする job 名。 */
export const batchJobNames = {
	umaOneDrawTopic: "uma-one-draw-topic",
	umaOneDrawTopicScheduler: "uma-one-draw-topic-scheduler",
	playCheckReminder: "play-check-reminder",
} as const;
