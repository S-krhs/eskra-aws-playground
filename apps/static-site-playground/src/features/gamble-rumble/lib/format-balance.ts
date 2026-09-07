// In scope: converting a yen balance into the selected unit and rendering it with that unit
// Out of scope: defining the currency units, how it looks, the tweet text

import type { CurrencyUnit } from "../model/currency-unit.js";

/**
 * Three significant digits, but the integer part is never rounded away (12,345 doesn't become 12,300).
 * The result always starts with exactly one sign character (`-` when negative, `+` at zero and above).
 */
export const formatBalance = (yen: number, unit: CurrencyUnit): string => {
	const amount = (yen / unit.yenPerUnit).toLocaleString("ja-JP", {
		maximumSignificantDigits: 3,
		maximumFractionDigits: 0,
		roundingPriority: "morePrecision",
	});
	return `${yen < 0 ? amount : `+${amount}`}${unit.label}`;
};
