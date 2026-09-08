// In scope: applying a replacement list and a max-length cap to a string
// Out of scope: deciding what counts as a secret for a specific service, log output

/** A string `pattern` replaces every occurrence (`replaceAll`); a `RegExp` pattern follows its own flags. */
export interface TextReplacement {
	pattern: string | RegExp;
	replacement: string;
}

export interface SanitizeTextOptions {
	replacements?: readonly TextReplacement[];
	maxLength?: number;
}

const DEFAULT_MAX_LENGTH = 512;

/** Applies `replacements` in order, then truncates to `maxLength`. */
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
