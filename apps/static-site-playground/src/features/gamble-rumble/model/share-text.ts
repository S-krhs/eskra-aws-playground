// In scope: 収支を晒すときのツイート文面
// Out of scope: 投稿画面の URL の組み立て、収支の状態管理

import { formatBalance } from "../lib/format-balance.js";
import type { CurrencyUnit } from "./currency-unit.js";

/** 収支を「大体N単位分負けました」の文面にする。プラマイゼロだけ言い回しが変わる */
export const shareText = (yen: number, unit: CurrencyUnit): string => {
	const amount = formatBalance(yen, unit).slice(1);
	const result =
		yen === 0
			? "プラマイゼロ即ち実質勝ち。"
			: `大体${amount}分${yen < 0 ? "負けました" : "勝ちました"}。`;
	return `${result} \nsasahara.uk/gamble-rumble`;
};
