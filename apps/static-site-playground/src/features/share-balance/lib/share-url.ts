// In scope: 収支からツイート文面を組み立て、投稿画面の URL にする
// Out of scope: リンクの描画、収支の状態管理

import { formatBalance } from "@/entities/currency-unit/lib/format-balance.js";
import type { CurrencyUnit } from "@/entities/currency-unit/model/currency-unit.js";

/** 収支を「大体N単位分負けました」の文面にして、ツイート画面を開く URL を作る */
export const shareUrl = (yen: number, unit: CurrencyUnit): string => {
	const amount = formatBalance(yen, unit).slice(1);
	const result =
		yen === 0
			? "プラマイゼロ即ち実質勝ち。"
			: `大体${amount}分${yen < 0 ? "負けました" : "勝ちました"}。`;
	const text = `${result} \nsasahara.uk/gamble-rumble`;
	return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&hashtags=sasaharaUK`;
};
