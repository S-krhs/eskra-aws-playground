// In scope: Yaccho Bot として Discord へ登録し、routing する application command を一元管理する
// Out of scope: Discord API 登録形式への変換、routing、operation の実装を行う

/** Yaccho Bot の Discord application command 定義。 */
export const commands = {
	hello: {
		name: "hello",
		description: "ﾔｯﾁｮがあいさつするよ～",
	},
} as const;
