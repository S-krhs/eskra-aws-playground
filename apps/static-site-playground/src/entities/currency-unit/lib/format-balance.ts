// In scope: 円建ての収支を選択中の単位へ換算し、単位付きの表示文字列にする
// Out of scope: 通貨単位の定義、表示の見た目、ツイート文面

import type { CurrencyUnit } from "@/entities/currency-unit/model/currency-unit.js";

/**
 * 円建ての収支を選択中の単位へ換算し、有効数字 3 桁の単位付き文字列にする。
 * 先頭は必ず符号 1 文字になる（負は `-`、0 と正は `+`）。
 */
export const formatBalance = (yen: number, unit: CurrencyUnit): string => {
	const amount = (yen / unit.yenPerUnit).toLocaleString("ja-JP", {
		maximumSignificantDigits: 3,
	});
	return `${yen < 0 ? amount : `+${amount}`}${unit.label}`;
};
