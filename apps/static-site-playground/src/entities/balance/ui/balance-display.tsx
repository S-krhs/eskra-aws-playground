// In scope: 収支の値を選択中の単位で表示し、負けと大勝ちで見た目を変える
// Out of scope: 収支の状態管理、単位の換算そのもの、注意文

import { rainbowYen } from "@/entities/balance/model/balance-thresholds.js";
import { formatBalance } from "@/entities/currency-unit/lib/format-balance.js";
import type { CurrencyUnit } from "@/entities/currency-unit/model/currency-unit.js";
import "./balance-display.css";

interface Props {
	balanceYen: number;
	unit: CurrencyUnit;
}

/** 収支を単位付きで表示する。負けは赤、大勝ちは虹色になる */
export const BalanceDisplay = ({ balanceYen, unit }: Props) => {
	const classes = [
		"balance-display",
		balanceYen < 0 ? "deficit" : "",
		balanceYen >= rainbowYen ? "rainbow" : "",
	]
		.filter(Boolean)
		.join(" ");

	return (
		<output className={classes}>
			{`${formatBalance(balanceYen, unit)}${unit.label}`}
		</output>
	);
};
