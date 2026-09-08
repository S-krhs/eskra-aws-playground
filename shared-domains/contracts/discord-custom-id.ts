// In scope: the type for a Discord custom_id, interpreted per this app's shared convention
// Out of scope: building/interpreting a custom_id
export interface DiscordCustomId {
	prefix: string;
	target?: string;
	action: string;
}
