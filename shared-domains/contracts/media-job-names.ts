// In scope: メディアライブラリのジョブ名を一元管理する
// Out of scope: ジョブの実装、SQS message の構築、ルーティングを持つ

/**
 * メディアライブラリのジョブ名。
 * 起動する側(scheduler / 管理ツール)と受ける側(batch / sqs-worker)が別 app に分かれるため、
 * 名前はここだけで決める。
 */
export const mediaJobNames = {
	mediaSync: "media-sync",
	mediaThumbnail: "media-thumbnail",
} as const;
