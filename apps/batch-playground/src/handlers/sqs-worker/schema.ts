// In scope: sqs-worker Lambda の起動イベント・message body の schema と、Lambda へ返す partial batch response の型を提供する
// Out of scope: message body の業務的解釈、ジョブ解決、record ごとの実行制御を行う
import { interactionJobMessageSchema } from "@eskra-aws-playground/shared-domains/contracts/interaction-job-message.js";
import { mediaThumbnailMessageSchema } from "@eskra-aws-playground/shared-domains/contracts/media-thumbnail-message.js";
import { z } from "zod";

/** sqs-worker Lambda が受け取る起動イベント schema。SQS が record をまとめて届ける。 */
export const sqsWorkerEventSchema = z.object({
	Records: z.array(
		z.object({
			messageId: z.string().min(1),
			body: z.string(),
		}),
	),
});

/** sqs-worker Lambda が受け取る起動イベント。 */
export type SqsWorkerEvent = z.infer<typeof sqsWorkerEventSchema>;

/**
 * sqs-worker が受け取る message body の schema。
 * この handler は queue ごとに別の Lambda として動くため、どの queue から
 * 届いても job 名だけで担当ジョブへ解決できるようにまとめて受ける。
 */
export const sqsJobMessageSchema = z.union([
	interactionJobMessageSchema,
	mediaThumbnailMessageSchema,
]);

/** sqs-worker が受け取る message body。 */
export type SqsJobMessage = z.infer<typeof sqsJobMessageSchema>;

/** sqs-worker Lambda が返す SQS partial batch response。失敗した record だけを再試行対象にする。 */
export interface SqsWorkerResponse {
	batchItemFailures: {
		itemIdentifier: string;
	}[];
}
