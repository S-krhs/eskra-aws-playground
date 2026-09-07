// In scope: batch handler が受け付ける job 名を一元管理する
// Out of scope: job の実装、Lambda イベントの解釈、実行スケジュールを持つ
import { mediaJobNames } from "@eskra-aws-playground/shared-domains/contracts/media-job-names.js";

/** Batch Playground app でサポートする job 名。 */
export const batchJobNames = {
	umaOneDrawTopic: "uma-one-draw-topic",
	umaOneDrawTopicScheduler: "uma-one-draw-topic-scheduler",
	// 管理ツールからも起動するため、名前は shared-domains で共有する
	mediaSync: mediaJobNames.mediaSync,
	playCheckReminder: "play-check-reminder",
} as const;
