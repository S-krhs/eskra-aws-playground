// In scope: sqs-worker が受け付けるメディアライブラリのジョブ名を一元管理する
// Out of scope: ジョブの実装、SQS message の構築、ルーティングを持つ

/** メディアライブラリの後処理を担う SQS ジョブ名。 */
export const mediaJobNames = {
	mediaThumbnail: "media-thumbnail",
} as const;
