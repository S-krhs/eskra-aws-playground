// In scope: showing the balance in whichever tone it is handed
// Out of scope: deciding the tone, unit conversion and building the string

import "./balance-display.css";

/** How the balance is shown; `loss` is red, `jackpot` goes rainbow */
export type BalanceTone = "normal" | "loss" | "jackpot";

const toneClasses: Record<BalanceTone, string> = {
	normal: "",
	loss: "text-red-600",
	jackpot: "animate-[gaming_2s_linear_infinite]",
};

interface Props {
	tone: BalanceTone;
	/** The balance already formatted with its unit; the currency-unit side builds it */
	text: string;
}

/** Color and rainbow follow the tone the caller decided */
export const BalanceDisplay = ({ tone, text }: Props) => {
	return (
		<output
			className={`bevel-sunken block bg-white px-2.5 py-1.5 text-right font-['MS_Gothic','Osaka-Mono',monospace] font-bold text-2xl ${toneClasses[tone]}`}
		>
			{text}
		</output>
	);
};
