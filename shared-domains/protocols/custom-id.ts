// In scope: converting between a Discord custom_id and its prefix / optional target / action
// Out of scope: what a prefix, target, or action means to a feature, and checking it against registered values
import type { DiscordCustomId } from "../contracts/discord-custom-id.js";

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
