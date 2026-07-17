// In scope: route の分岐と Discord への登録で共有するスラッシュコマンドを宣言する
// Out of scope: Discord API 固有の登録形式への変換、コマンドの応答内容、interaction の parse、Discord API 呼び出し

/**
 * スラッシュコマンドの定義。
 * コマンドを追加すると Discord への同期対象に自動で含まれる。
 */
export const COMMAND_DEFINITIONS = {
	hello: {
		commandName: "hello",
		description: "ﾔｯﾁｮがあいさつするよ～",
	},
} as const;
