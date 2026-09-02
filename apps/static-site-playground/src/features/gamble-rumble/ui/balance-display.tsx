// In scope: 収支の値を表示し、負けと大勝ちで見た目を変える
// Out of scope: 単位への換算と文字列の組み立て、収支の状態管理

import { rainbowYen } from "../model/balance-thresholds.js";
import "./balance-display.css";

interface Props {
	balanceYen: number;
	/** 単位付きに整形済みの収支。組み立ては通貨単位側が担う */
	text: string;
}

/** 収支を表示する。負けは赤、大勝ちは虹色になる */
export const BalanceDisplay = ({ balanceYen, text }: Props) => {
	const toneClasses = balanceYen < 0 ? "text-red-600" : "";
	const rainbowClasses =
		balanceYen >= rainbowYen ? "animate-[gaming_2s_linear_infinite]" : "";

	return (
		<output
			className={`bevel-sunken block bg-white px-2.5 py-1.5 text-right font-[family-name:'MS_Gothic','Osaka-Mono',monospace] font-bold text-2xl ${toneClasses} ${rainbowClasses}`}
		>
			{text}
		</output>
	);
};
