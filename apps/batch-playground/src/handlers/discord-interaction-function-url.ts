// In scope: Lambda Function URL として公開され、Discord interaction の HTTP リクエストを interaction ジョブへ委譲する
// Out of scope: 署名検証、interaction の解釈、応答 payload 作成の詳細を持つ
import { discordInteractionJob } from "../jobs/discord-interaction.js";
import type { DiscordInteractionResponse } from "../shared/schemas/lambda/discord-interaction/response.js";

/** Discord interaction を受ける Lambda Function URL 公開エンドポイント。 */
export const handler = async (
	event: unknown = {},
): Promise<DiscordInteractionResponse> => {
	return discordInteractionJob(event);
};
