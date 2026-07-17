// In scope: 宣言済みのスラッシュコマンドを Discord API の登録形式へ変換し、guild へ bulk overwrite で同期する
// Out of scope: コマンドの宣言、応答内容、interaction の解釈
import {
	DiscordCommandClient,
	type DiscordCommandDefinition,
} from "@eskra-aws-playground/integration-discord/discord-command-client.js";
import { Resource } from "sst/resource";

import { COMMAND_DEFINITIONS } from "@/handlers/function-url/routes/discord-interaction/command-definitions.js";

/** アプリのコマンド定義を Discord API の登録形式へ変換する。 */
const DISCORD_COMMAND_DEFINITIONS: readonly DiscordCommandDefinition[] =
	Object.values(COMMAND_DEFINITIONS).map(({ commandName, description }) => {
		return { name: commandName, description };
	});

/**
 * 宣言済みコマンド定義を Discord guild へ bulk overwrite で同期する。
 * --dry-run では送信せず、現登録と登録予定を並べて表示するだけ。
 * SST secret を Resource で参照するため `sst shell` 経由で起動する(root の `npm run discord:sync` / `discord:sync:dry`)。
 */
const syncDiscordCommands = async (): Promise<void> => {
	const client = new DiscordCommandClient(Resource.DiscordBotToken.value);
	const applicationId = Resource.DiscordApplicationId.value;
	const guildId = Resource.DiscordGuildId.value;

	if (process.argv.includes("--dry-run")) {
		const current = await client.getGuildCommands(applicationId, guildId);
		console.log("Discord に現在登録されているコマンド:");
		console.log(JSON.stringify(current, null, 2));
		console.log("登録予定(コード):");
		console.log(JSON.stringify(DISCORD_COMMAND_DEFINITIONS, null, 2));
		return;
	}

	await client.overwriteGuildCommands(
		applicationId,
		guildId,
		DISCORD_COMMAND_DEFINITIONS,
	);

	const registered = DISCORD_COMMAND_DEFINITIONS.map((command) => {
		return `/${command.name}`;
	}).join(", ");
	console.log(`Discord guild コマンドを同期しました: ${registered}`);
};

syncDiscordCommands().catch((error: unknown) => {
	console.error(
		error instanceof Error ? error.message : "コマンド同期に失敗しました。",
	);
	process.exit(1);
});
