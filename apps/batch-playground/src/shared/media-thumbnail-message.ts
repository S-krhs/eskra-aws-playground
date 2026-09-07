// In scope: サムネイル生成 job へ渡す SQS message の形式
// Out of scope: message の送信、サムネイルの生成、R2 と DB への反映
import { z } from "zod";

/** サムネイル生成 1 件分の message。 */
export const mediaThumbnailMessageSchema = z.object({
	mediaId: z.uuid(),
	objectKey: z.string().min(1),
});

/** サムネイル生成 1 件分の message。 */
export type MediaThumbnailMessage = z.infer<typeof mediaThumbnailMessageSchema>;
