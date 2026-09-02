// In scope: 円建ての収支を選択中の単位へ換算し、単位付きの表示文字列にする
// Out of scope: 通貨単位の定義、表示の見た目、ツイート文面

import type { CurrencyUnit } from "../model/currency-unit.js";

/**
 * 円建ての収支を選択中の単位へ換算し、単位付き文字列にする。
 * 桁数は有効数字 3 桁だが、整数部分は丸めずすべて表示する（12,345 は 12,300 にしない）。
 * 先頭は必ず符号 1 文字になる（負は `-`、0 と正は `+`）。
 */
export const formatBalance = (yen: number, unit: CurrencyUnit): string => {
	const amount = (yen / unit.yenPerUnit).toLocaleString("ja-JP", {
		maximumSignificantDigits: 3,
		maximumFractionDigits: 0,
		roundingPriority: "morePrecision",
	});
	return `${yen < 0 ? amount : `+${amount}`}${unit.label}`;
};
