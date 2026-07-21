// In scope: sqs-worker が受け取る interaction ジョブ message の外部入力 schema と型を提供する
// Out of scope: SQS 送受信、ジョブの実行、Discord API 通信、deferred ack の生成
import { z } from "zod";
import { interactionJobNames } from "@/shared/contracts/interaction-job-names.js";

const snowflakeSchema = z.string().regex(/^\d{1,20}$/);

/** deferred 応答済み interaction へ後追い送信するための callback 情報。 */
const callbackShape = {
	applicationId: snowflakeSchema,
	token: z.string().min(1),
} as const;

/**
 * interaction ジョブ message の schema。job で識別する discriminated union で、
 * ジョブごとに worker が処理に必要とする値だけを持つ。
 */
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

/** interaction ジョブ message。 */
export type InteractionJobMessage = z.infer<typeof interactionJobMessageSchema>;
