// In scope: the interaction job names sqs-worker accepts, and the external-input schema for one job's message
// Out of scope: job implementation, SQS send/receive, routing, Discord API calls, building a deferred ack
import { z } from "zod";

export const interactionJobNames = {
	yacchoHelloReply: "yaccho-hello-reply",
	kaguyaInuihiroshiReply: "kaguya-inuihiroshi-reply",
	gambleCheckEnable: "gamble-check-enable",
	gambleCheckDisable: "gamble-check-disable",
	playCheckReminderChoice: "play-check-reminder-choice",
} as const;

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
