// In scope: Bot ごとのスラッシュコマンドを Discord API の登録形式へ変換し、global scope へ bulk overwrite する
// Out of scope: コマンドの宣言、応答内容、interaction の解釈
import {
	DiscordCommandClient,
	type DiscordCommandDefinition,
} from "@eskra-aws-playground/integration-discord/discord-command-client.js";
import { Resource } from "sst/resource";

import { commands as kaguyaCommands } from "../handlers/function-url/routes/kaguya-bot-interaction/contracts/commands.js";
import { commands as yacchoCommands } from "../handlers/function-url/routes/yaccho-bot-interaction/contracts/commands.js";

interface DiscordCommandSyncTarget {
	botName: string;
	client: DiscordCommandClient;
	applicationId: string;
	definitions: readonly DiscordCommandDefinition[];
}

/**
 * Botごとのコマンド定義を global scope へ bulk overwrite で同期する。
 * --dry-run では送信せず、現登録と登録予定を並べて表示するだけ。
 * SST secret を Resource で参照するため `sst shell` 経由で起動する(root の `npm run discord:sync` / `discord:sync:dry`)。
 */
const syncDiscordCommands = async (): Promise<void> => {
	const targets: readonly DiscordCommandSyncTarget[] = [
		{
			botName: "yaccho-bot",
			client: new DiscordCommandClient(Resource.YacchoDiscordBotToken.value),
			applicationId: Resource.YacchoDiscordApplicationId.value,
			definitions: Object.values(yacchoCommands),
		},
		{
			botName: "kaguya-bot",
			client: new DiscordCommandClient(Resource.KaguyaDiscordBotToken.value),
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
