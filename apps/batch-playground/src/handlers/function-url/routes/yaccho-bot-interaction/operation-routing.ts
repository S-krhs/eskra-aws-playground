// In scope: interaction kind と明示登録した command・prefix から operation を選択する
// Out of scope: operation の実行、未対応時の fallback、HTTP response の形成
import type { DiscordInteractionResponsePayload } from "@/external-protocols/discord-message/interaction-response.js";
import type { DiscordInteraction } from "@/external-protocols/discord-message/parse.js";
import type { OperationResult } from "@/handlers/function-url/routes/intermediate-models/operation-result.js";
import { autocompleteOperation } from "./operations/autocomplete-operation.js";
import { helloCommandOperation } from "./operations/hello-command-operation.js";
import { pingOperation } from "./operations/ping-operation.js";
import { playCheckReminderCommandOperation } from "./operations/play-check-reminder-command-operation.js";
import { playCheckReminderOperation } from "./operations/play-check-reminder-operation.js";
import { commands } from "./shared/commands.js";
import { prefixes } from "./shared/prefixes.js";

type DiscordInteractionOperation = (
	interaction: DiscordInteraction,
) =>
	| OperationResult<DiscordInteractionResponsePayload>
	| undefined
	| Promise<OperationResult<DiscordInteractionResponsePayload> | undefined>;

const commandOperations = new Map<string, DiscordInteractionOperation>([
	[commands.hello.name, helloCommandOperation],
	[commands.playCheckReminder.name, playCheckReminderCommandOperation],
]);

const messageOperations = new Map<string, DiscordInteractionOperation>([
	[prefixes.playCheckReminder, playCheckReminderOperation],
]);

/** interaction の種類と明示された command・prefix から operation を返す。 */
export const findInteractionOperation = (
	interaction: DiscordInteraction,
): DiscordInteractionOperation | undefined => {
	if (interaction.kind === "ping") {
		return pingOperation;
	}
	if (interaction.kind === "autocomplete") {
		return autocompleteOperation;
	}
	if (interaction.kind === "application-command") {
		return commandOperations.get(interaction.command.name);
	}
	if (interaction.kind === "message-component" && interaction.customId) {
		return messageOperations.get(interaction.customId.prefix);
	}

	return undefined;
};
