// In scope: Yaccho Bot として Discord へ登録し、routing する application command を一元管理する
// Out of scope: Discord API 登録形式への変換、routing、operation の実装を行う

const installationTypes = { guild: 0 } as const;
const interactionContexts = { guild: 0 } as const;

/** Yaccho Bot の Discord application command 定義。 */
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
