// In scope: Lambda Function URL の公開エンドポイントとして HTTP リクエストを受け、担当 job へ委譲する
// Out of scope: 署名検証、リクエスト内容の解釈、応答 payload 作成の詳細を持つ
import { discordInteractionJob } from "../jobs/discord-interaction.js";
import type { DiscordInteractionResponse } from "../shared/schemas/lambda/discord-interaction/response.js";

/** Lambda Function URL 公開エンドポイントのエントリポイント。現状は Discord interaction のみを扱う。 */
export const handler = async (
	event: unknown = {},
): Promise<DiscordInteractionResponse> => {
	return discordInteractionJob(event);
};
