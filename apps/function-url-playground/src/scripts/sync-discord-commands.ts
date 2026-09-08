// In scope: converting each bot's slash commands into the Discord API's registration form and bulk-overwriting them at global scope
// Out of scope: declaring the commands, their response content, interpreting an interaction
import {
	DiscordBotClient,
	type DiscordCommandDefinition,
} from "@eskra-aws-playground/integration-discord/discord-bot-client.js";
import { Resource } from "sst/resource";

import { commands as kaguyaCommands } from "../handlers/routes/kaguya-bot-interaction/contracts/commands.js";
import { commands as yacchoCommands } from "../handlers/routes/yaccho-bot-interaction/contracts/commands.js";

interface DiscordCommandSyncTarget {
	botName: string;
	client: DiscordBotClient;
	applicationId: string;
	definitions: readonly DiscordCommandDefinition[];
}

/**
 * Syncs each bot's commands to global scope by bulk overwrite. --dry-run sends nothing and only prints
 * what is registered now beside what would be. SST secrets are read through Resource, so it runs via
 * `sst shell` (the root's `npm run discord:sync` / `discord:sync:dry`).
 */
const syncDiscordCommands = async (): Promise<void> => {
	const targets: readonly DiscordCommandSyncTarget[] = [
		{
			botName: "yaccho-bot",
			client: new DiscordBotClient(Resource.YacchoDiscordBotToken.value),
			applicationId: Resource.YacchoDiscordApplicationId.value,
			definitions: Object.values(yacchoCommands),
		},
		{
			botName: "kaguya-bot",
			client: new DiscordBotClient(Resource.KaguyaDiscordBotToken.value),
			applicationId: Resource.KaguyaDiscordApplicationId.value,
			definitions: Object.values(kaguyaCommands),
		},
	];

	if (process.argv.includes("--dry-run")) {
		for (const target of targets) {
			const current = await target.client.getGlobalCommands(
				target.applicationId,
			);
			console.log(`${target.botName} に現在登録されている global command:`);
			console.log(JSON.stringify(current, null, 2));
			console.log(`${target.botName} の登録予定(コード):`);
			console.log(JSON.stringify(target.definitions, null, 2));
		}
		return;
	}

	for (const target of targets) {
		await target.client.overwriteGlobalCommands(
			target.applicationId,
			target.definitions,
		);

		const registered = target.definitions
			.map((command) => {
				return `/${command.name}`;
			})
			.join(", ");
		console.log(
			`${target.botName} の global command を同期しました: ${registered}`,
		);
	}
};

syncDiscordCommands().catch((error: unknown) => {
	console.error(
		error instanceof Error ? error.message : "コマンド同期に失敗しました。",
	);
	process.exit(1);
});
