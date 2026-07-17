// In scope: Yaccho Bot として Discord へ登録し、routing する application command を一元管理する
// Out of scope: Discord API 登録形式への変換、routing、operation の実装を行う

const optionTypes = {
	subcommand: 1,
} as const;
const installationTypes = { guild: 0 } as const;
const interactionContexts = { guild: 0 } as const;

/** Yaccho Bot の Discord application command 定義。 */
export const commands = {
	hello: {
		name: "hello",
		description: "ﾔｯﾁｮがあいさつするよ～",
	},
	playCheckReminder: {
		name: "play-check-reminder",
		description: "遊技チェックリマインダーを設定する",
		integration_types: [installationTypes.guild],
		contexts: [interactionContexts.guild],
		options: [
			{
				type: optionTypes.subcommand,
				name: "enable",
				description: "現在のチャンネルで自分のリマインダーを有効にする",
			},
			{
				type: optionTypes.subcommand,
				name: "disable",
				description: "自分のリマインダーを無効にする",
			},
		],
	},
} as const;
