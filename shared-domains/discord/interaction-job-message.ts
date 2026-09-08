// In scope: the external-input schema and type for an interaction job message received by sqs-worker
// Out of scope: SQS send/receive, running the job, Discord API calls, building a deferred ack
import { z } from "zod";
import { interactionJobNames } from "./interaction-job-names.js";

const snowflakeSchema = z.string().regex(/^\d{1,20}$/);

/** For sending a follow-up on an already-deferred interaction. */
const callbackShape = {
	applicationId: snowflakeSchema,
	token: z.string().min(1),
} as const;

/** Discriminated union on `job` — each variant carries only what that job's worker needs. */
export const interactionJobMessageSchema = z.discriminatedUnion("job", [
	z.object({
		job: z.literal(interactionJobNames.yacchoHelloReply),
		...callbackShape,
	}),
	z.object({
		job: z.literal(interactionJobNames.kaguyaInuihiroshiReply),
		...callbackShape,
	}),
	z.object({
		job: z.literal(interactionJobNames.gambleCheckEnable),
		...callbackShape,
		guildId: snowflakeSchema,
		channelId: snowflakeSchema,
		userId: snowflakeSchema,
	}),
	z.object({
		job: z.literal(interactionJobNames.gambleCheckDisable),
		...callbackShape,
		guildId: snowflakeSchema,
		userId: snowflakeSchema,
	}),
	z.object({
		job: z.literal(interactionJobNames.playCheckReminderChoice),
		...callbackShape,
		action: z.string().min(1),
	}),
]);

export type InteractionJobMessage = z.infer<typeof interactionJobMessageSchema>;
