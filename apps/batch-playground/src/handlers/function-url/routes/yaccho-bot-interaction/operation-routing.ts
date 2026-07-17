// In scope: Discord interaction をフラットな route 定義と照合して operation を選択する
// Out of scope: operation の実行、未対応時の fallback、HTTP response の形成
import type { DiscordInteractionResponsePayload } from "@/external-protocols/discord-message/interaction-response.js";
import {
	type DiscordInteraction,
	interactionTypes,
} from "@/external-protocols/discord-message/parse.js";
import type { OperationResult } from "@/handlers/function-url/routes/intermediate-models/operation-result.js";
import { autocompleteOperation } from "./operations/autocomplete-operation.js";
import { helloCommandOperation } from "./operations/hello-command-operation.js";
import { pingOperation } from "./operations/ping-operation.js";
import { playCheckReminderOperation } from "./operations/play-check-reminder-operation.js";
import { commands } from "./shared/commands.js";
import { prefixes } from "./shared/prefixes.js";

type DiscordInteractionOperation = (
	interaction: DiscordInteraction,
) => OperationResult<DiscordInteractionResponsePayload> | undefined;

interface OperationRoute {
	matches(interaction: DiscordInteraction): boolean;
	operation: DiscordInteractionOperation;
}

const operationRoutes = new Map<string, OperationRoute>([
	[
		"ping",
		{
			matches: (interaction) => {
				return interaction.type === interactionTypes.ping;
			},
			operation: pingOperation,
		},
	],
	[
		"autocomplete",
		{
			matches: (interaction) => {
				return interaction.type === interactionTypes.autocomplete;
			},
			operation: autocompleteOperation,
		},
	],
	[
		"hello-command",
		{
			matches: (interaction) => {
				return (
					interaction.type === interactionTypes.command &&
					interaction.commandName === commands.hello.name
				);
			},
			operation: helloCommandOperation,
		},
	],
	[
		"play-check-reminder-message",
		{
			matches: (interaction) => {
				return (
					interaction.type === interactionTypes.component &&
					interaction.customId?.prefix === prefixes.playCheckReminder
				);
			},
			operation: playCheckReminderOperation,
		},
	],
]);

/** interaction に一致するフラットな route 定義の operation を返す。 */
export const findInteractionOperation = (
	interaction: DiscordInteraction,
): DiscordInteractionOperation | undefined => {
	for (const route of operationRoutes.values()) {
		if (route.matches(interaction)) {
			return route.operation;
		}
	}

	return undefined;
};
