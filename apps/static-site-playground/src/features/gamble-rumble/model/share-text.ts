// In scope: the tweet text used to show off a balance
// Out of scope: building the compose-screen URL, holding the balance state

import { formatBalance } from "../lib/format-balance.js";
import type { CurrencyUnit } from "./currency-unit.js";

/** The tool's own public URL added to the text; no scheme */
const toolUrl = "sasahara.uk/gamble-rumble";

/** Turns the balance into the "lost about N units" line; only an exact zero gets different wording */
export const shareText = (yen: number, unit: CurrencyUnit): string => {
	const amount = formatBalance(yen, unit).slice(1);
	const result =
		yen === 0
			? "プラマイゼロ即ち実質勝ち。"
			: `大体${amount}分${yen < 0 ? "負けました" : "勝ちました"}。`;
	return `${result} \n${toolUrl}`;
};
