// In scope: the shape of a Discord custom_id, and converting between it and the wire string
// Out of scope: the registered prefixes, what a prefix, target, or action means to a feature

/** Interpreted per this app's own convention; Discord itself only sees the joined string. */
export interface DiscordCustomId {
	prefix: string;
	target?: string;
	action: string;
}

const CUSTOM_ID_SEPARATOR = ":";

/** Discord's own cap. Going over it only ever shows up as a 400 at send time. */
const CUSTOM_ID_MAX_LENGTH = 100;

/** With no target the second segment is still kept, giving `prefix::action`. */
export const buildCustomId = ({
	prefix,
	target = "",
	action,
}: DiscordCustomId): string => {
	if (
		!prefix ||
		!action ||
		[prefix, target, action].some((segment) => {
			return segment.includes(CUSTOM_ID_SEPARATOR);
		})
	) {
		throw new Error("custom_id の segment が不正です。");
	}

	const customId = [prefix, target, action].join(CUSTOM_ID_SEPARATOR);

	if (customId.length > CUSTOM_ID_MAX_LENGTH) {
		throw new Error(
			`custom_id が ${CUSTOM_ID_MAX_LENGTH} 文字を超えています。`,
		);
	}

	return customId;
};

export const parseCustomId = (
	customId: string,
): DiscordCustomId | undefined => {
	const parts = customId.split(CUSTOM_ID_SEPARATOR);
	if (parts.length !== 3) {
		return undefined;
	}

	const [prefix, target, action] = parts;
	if (!prefix || !action) {
		return undefined;
	}

	return target ? { prefix, target, action } : { prefix, action };
};
