// In scope: サムネイル未生成のメディアを生成 job の queue へ投入する
// Out of scope: queue URL と job 名の解決、サムネイルの生成、同期の差分判定
import { SqsMessageSender } from "@eskra-aws-playground/integration-sqs/sqs-message-sender.js";
import { mediaObjectRepository } from "@eskra-aws-playground/repositories/media/media-object/repository.js";
import type { MediaThumbnailMessage } from "@eskra-aws-playground/shared-domains/contracts/media-thumbnail-message.js";

// 1 回の同期で queue へ投入する件数の上限。
// 初回の取り込みなど対象が大量にある場合でも一度に投入しすぎないようにし、超えた分は次回の同期で扱う。
const ENQUEUE_LIMIT = 10_000;

// サムネイル生成を試行する最大回数。
// 上限を設けないと、生成に失敗し続けるメディアの再投入で DLQ が埋まったままになる。
const MAX_ATTEMPTS = 3;

// 前回の投入からこの間隔が経つまでは再投入しない待機時間。
// SQS 側の再試行(可視性タイムアウト 6 分 × 3 回)より長く取り、処理中のメッセージを重複して投入しないようにする。
const RETRY_INTERVAL_MS = 60 * 60 * 1000;

/**
 * サムネイルが未生成のメディアを queue へ投入する。
 * 投入した時点で試行回数を進め、処理中のものと生成できないものを重複して投入しないようにする。
 */
export const enqueueMissingThumbnails = async (input: {
	queueUrl: string;
	job: MediaThumbnailMessage["job"];
	enqueuedAt: Date;
}): Promise<number> => {
	const targets = await mediaObjectRepository.findWithoutThumbnail({
		limit: ENQUEUE_LIMIT,
		maxAttempts: MAX_ATTEMPTS,
		retryBefore: new Date(input.enqueuedAt.getTime() - RETRY_INTERVAL_MS),
	});

	if (targets.length === 0) {
		return 0;
	}

	const sender = new SqsMessageSender(input.queueUrl);
	await sender.sendMessages(
		targets.map((target) => {
			return {
				id: target.id,
				body: {
					job: input.job,
					mediaId: target.id,
					objectKey: target.objectKey,
				} satisfies MediaThumbnailMessage,
			};
		}),
	);

	// 送信できたものだけ試行回数を進める。送信前に進めると、送信に失敗した分の再試行回数まで消費してしまう
	await mediaObjectRepository.markThumbnailEnqueued(
		targets.map((target) => {
			return target.id;
		}),
		input.enqueuedAt,
	);

	return targets.length;
};
