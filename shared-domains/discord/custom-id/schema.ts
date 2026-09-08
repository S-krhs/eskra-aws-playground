// In scope: the shape of a Discord custom_id and the prefixes it is routed by
// Out of scope: building or interpreting a custom_id, routing, what a prefix means to a feature

/** Interpreted per this app's own convention; Discord itself only sees the joined string. */
export interface DiscordCustomId {
	prefix: string;
	target?: string;
	action: string;
}

export const prefixes = {
	playCheckReminder: "play-check-reminder",
} as const;
