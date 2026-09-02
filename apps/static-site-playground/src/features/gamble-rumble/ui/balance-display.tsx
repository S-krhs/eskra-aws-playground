// In scope: 収支の値を、渡された調子で表示する
// Out of scope: どの調子で出すかの判断、単位への換算と文字列の組み立て

import "./balance-display.css";

/** 収支の見せ方。`loss` は赤、`jackpot` は虹色になる */
export type BalanceTone = "normal" | "loss" | "jackpot";

const toneClasses: Record<BalanceTone, string> = {
	normal: "",
	loss: "text-red-600",
	jackpot: "animate-[gaming_2s_linear_infinite]",
};

interface Props {
	tone: BalanceTone;
	/** 単位付きに整形済みの収支。組み立ては通貨単位側が担う */
	text: string;
}

/** 収支を表示する。色と虹色は呼び出し側が決めた調子に従う */
export const BalanceDisplay = ({ tone, text }: Props) => {
	return (
		<output
			className={`bevel-sunken block bg-white px-2.5 py-1.5 text-right font-[family-name:'MS_Gothic','Osaka-Mono',monospace] font-bold text-2xl ${toneClasses[tone]}`}
		>
			{text}
		</output>
	);
};
