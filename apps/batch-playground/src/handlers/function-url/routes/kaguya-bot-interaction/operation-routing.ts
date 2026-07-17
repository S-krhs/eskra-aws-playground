// In scope: Kaguya Bot の interaction kind と明示登録した command から operation を選択する
// Out of scope: operation の実行、未対応時の fallback、HTTP response の形成
import type { DiscordInteractionResponsePayload } from "@/external-protocols/discord-message/interaction-response.js";
import type { DiscordInteraction } from "@/external-protocols/discord-message/parse.js";
import type { OperationResult } from "@/handlers/function-url/routes/intermediate-models/operation-result.js";
import { inuihiroshiCommandOperation } from "./operations/inuihiroshi-command-operation.js";
import { pingOperation } from "./operations/ping-operation.js";
import { commands } from "./contracts/commands.js";

type DiscordInteractionOperation = (
	interaction: DiscordInteraction,
) => OperationResult<DiscordInteractionResponsePayload> | undefined;

const commandOperations = new Map<string, DiscordInteractionOperation>([
	[commands.inuihiroshi.name, inuihiroshiCommandOperation],
]);

/** interaction の種類と明示された command から operation を返す。 */
export const findInteractionOperation = (
	interaction: DiscordInteraction,
): DiscordInteractionOperation | undefined => {
	if (interaction.kind === "ping") {
		return pingOperation;
	}
	if (interaction.kind === "application-command") {
		return commandOperations.get(interaction.command.name);
	}

	return undefined;
};
