// In scope: sqs-worker が受け取るサムネイル生成 job message の外部入力 schema と型を提供する
// Out of scope: SQS 送受信、サムネイルの生成、R2 と DB への反映
import { z } from "zod";
import { mediaJobNames } from "./media-job-names.js";

/** サムネイル生成 1 件分の message。生成に要る所在だけを持つ。 */
export const mediaThumbnailMessageSchema = z.object({
	job: z.literal(mediaJobNames.mediaThumbnail),
	mediaId: z.uuid(),
	objectKey: z.string().min(1),
});

/** サムネイル生成 1 件分の message。 */
export type MediaThumbnailMessage = z.infer<typeof mediaThumbnailMessageSchema>;
