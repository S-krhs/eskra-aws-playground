// In scope: 文字列に置換リストと最大長制限を適用する
// Out of scope: 特定サービス固有の secret 判定やログ出力を行う

/** 文字列 sanitizer で適用する置換ルール。string pattern は全ての出現を置換し、RegExp は flag に従う。 */
export interface TextReplacement {
	pattern: string | RegExp;
	replacement: string;
}

/** 文字列 sanitizer の設定。 */
export interface SanitizeTextOptions {
	replacements?: readonly TextReplacement[];
	maxLength?: number;
}

const DEFAULT_MAX_LENGTH = 512;

/** 置換リストを順に適用し、最大文字数で切り詰める。 */
export const sanitizeText = (
	text: string,
	options: SanitizeTextOptions,
): string => {
	const { replacements = [], maxLength = DEFAULT_MAX_LENGTH } = options;

	if (!Number.isInteger(maxLength) || maxLength < 0) {
		throw new Error("maxLength は 0 以上の整数を指定してください");
	}

	let replacedText = text;
	for (const replacementRule of replacements) {
		replacedText =
			typeof replacementRule.pattern === "string"
				? replacedText.replaceAll(
						replacementRule.pattern,
						replacementRule.replacement,
					)
				: replacedText.replace(
						replacementRule.pattern,
						replacementRule.replacement,
					);
	}

	return replacedText.length > maxLength
		? replacedText.slice(0, maxLength)
		: replacedText;
};
