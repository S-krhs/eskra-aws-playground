// In scope: the one place listing job names the batch handler accepts
// Out of scope: job implementations, interpreting the Lambda event, schedules
import { mediaJobNames } from "@eskra-aws-playground/shared-domains/media/jobs/names.js";

export const batchJobNames = {
	umaOneDrawTopic: "uma-one-draw-topic",
	umaOneDrawTopicScheduler: "uma-one-draw-topic-scheduler",
	// The management tool invokes this too, so the name is shared through shared-domains
	mediaSync: mediaJobNames.mediaSync,
	playCheckReminder: "play-check-reminder",
} as const;
