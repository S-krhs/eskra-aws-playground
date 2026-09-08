// In scope: converting between a custom_id and the wire string
// Out of scope: its shape and the registered prefixes, what a prefix, target, or action means to a feature
import type { DiscordCustomId } from "./schema.js";

const CUSTOM_ID_SEPARATOR = ":";

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

	return [prefix, target, action].join(CUSTOM_ID_SEPARATOR);
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
