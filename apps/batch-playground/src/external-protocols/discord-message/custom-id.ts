// In scope: prefix・任意の target・action と Discord custom_id の相互変換
// Out of scope: prefix・target・action の機能固有な意味付けと登録値との照合

const CUSTOM_ID_SEPARATOR = ":";

/** アプリ共通規約で解釈した Discord custom_id。 */
export interface DiscordCustomId {
	prefix: string;
	target?: string;
	action: string;
}

/**
 * prefix・target・action から Discord custom_id を生成する。
 * target がない場合も2番目の区画を残し、`prefix::action` とする。
 */
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

/** Discord custom_id を prefix・任意の target・action に分解する。 */
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
