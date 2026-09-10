// In scope: the one place listing the application commands registered with Discord and routed as Yaccho Bot
// Out of scope: converting to the Discord API's registration form, routing, operation implementations

const installationTypes = { guild: 0 } as const;
const interactionContexts = { guild: 0 } as const;

export const commands = {
	hello: {
		name: "hello",
		description: "ﾔｯﾁｮがあいさつするよ～",
	},
	gambleCheckEnable: {
		name: "gamble-check-enable",
		description: "ヤチヨの遊技チェックリマインダーを設定する",
		integration_types: [installationTypes.guild],
		contexts: [interactionContexts.guild],
	},
	gambleCheckDisable: {
		name: "gamble-check-disable",
		description: "ヤチヨの遊技チェックリマインダーを停止する",
		integration_types: [installationTypes.guild],
		contexts: [interactionContexts.guild],
	},
} as const;
