// In scope: サムネイル未生成のメディアを生成 job の queue へ積む
// Out of scope: サムネイルの生成、同期の差分判定、R2 への通信
import { SqsMessageSender } from "@eskra-aws-playground/integration-sqs/sqs-message-sender.js";
import { mediaObjectRepository } from "@eskra-aws-playground/repositories/media/media-object/repository.js";
import { Resource } from "sst/resource";

// 初回の取り込みで一度に積み過ぎないようにする。残りは次の同期が拾う
const ENQUEUE_LIMIT = 10_000;

/**
 * サムネイルが未生成のメディアを queue へ積む。
 * 積んだ時点では DB を変えないため、生成が失敗しても次の同期が積み直す。
 */
export const enqueueMissingThumbnails = async (): Promise<number> => {
	const targets =
		await mediaObjectRepository.findWithoutThumbnail(ENQUEUE_LIMIT);

	if (targets.length === 0) {
		return 0;
	}

	const sender = new SqsMessageSender(Resource.MediaThumbnailQueue.url);
	await sender.sendMessages(
		targets.map((target) => {
			return {
				id: target.id,
				body: { mediaId: target.id, objectKey: target.objectKey },
			};
		}),
	);

	return targets.length;
};
