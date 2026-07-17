// In scope: Kaguya Bot として Discord へ登録し、routing する application command を一元管理する
// Out of scope: Discord API 登録形式への変換、routing、operation の実装を行う

/** Kaguya Bot の Discord application command 定義。 */
export const commands = {
	inuihiroshi: {
		name: "inuihiroshi",
		description: "近代において人間は基本的に自由",
	},
} as const;
