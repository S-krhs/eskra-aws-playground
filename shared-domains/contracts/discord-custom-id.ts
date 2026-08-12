// In scope: アプリ共通規約で解釈した Discord custom_id の型
// Out of scope: custom_id の生成・解釈処理

/** アプリ共通規約で解釈した Discord custom_id。 */
export interface DiscordCustomId {
	prefix: string;
	target?: string;
	action: string;
}
