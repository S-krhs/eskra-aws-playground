// In scope: 賭博の収支を積み上げ、選んだ通貨単位で表示してツイートへ渡す UI
// Out of scope: 通貨単位の定義と円換算、収支の永続化、ページ全体の骨組み

import { useState } from "react";
import {
	type CurrencyUnit,
	currencyUnits,
	formatBalance,
} from "./currency-units.js";
import "./gamble-rumble.css";

/** 投資・回収ボタン。単位の選択に関わらず、常に円で増減する */
const expenseSteps = [-10000, -1000, 1000, 10000];

/** これを下回ると注意文を出す収支（円） */
const cautionYen = -50000;

/** これ以上勝つと収支を虹色にする収支（円） */
const rainbowYen = 100000;

/** 収支を「大体N単位分負けました」の文面にして、ツイート画面を開く URL を作る */
const shareUrl = (
	yen: number,
	unit: CurrencyUnit,
	balanceText: string,
): string => {
	const amount = balanceText.slice(1);
	const result =
		yen === 0
			? "プラマイゼロ即ち実質勝ち。"
			: `大体${amount}${unit.label}分${yen < 0 ? "負けました" : "勝ちました"}。`;
	const text = `${result} \nsasahara.uk/gamble-rumble`;
	return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&hashtags=sasaharaUK`;
};

/** 収支を賭けの単位で積み上げ、ツイートで晒すところまでを担う island */
export const GambleRumble = () => {
	const [balanceYen, setBalanceYen] = useState(-20000);
	const [unit, setUnit] = useState(currencyUnits[0]);

	const balanceText = formatBalance(balanceYen, unit);
	const balanceClasses = [
		balanceYen < 0 ? "deficit" : "",
		balanceYen >= rainbowYen ? "rainbow" : "",
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div className="gamble-rumble">
			<section>
				{balanceYen <= cautionYen && (
					<div className="caution">
						<p>
							あなたの遊技は、もう“適度”を超えてしまっているかもしれません。
						</p>
					</div>
				)}
				<h2>収支</h2>
				<h3 className={balanceClasses}>{`${balanceText}${unit.label}`}</h3>
			</section>

			<section>
				<h2>投資・回収</h2>
				<div className="expenses-buttons">
					{expenseSteps.map((step) => {
						return (
							<button
								key={step}
								type="button"
								onClick={() => {
									return setBalanceYen(balanceYen + step);
								}}
							>
								{`${step > 0 ? "+" : ""}${step}円`}
							</button>
						);
					})}
				</div>
			</section>

			<section>
				<div className="unit-buttons">
					{currencyUnits.map((candidate) => {
						return (
							<button
								key={candidate.id}
								type="button"
								className={
									candidate.id === unit.id
										? "unit-select-item selected"
										: "unit-select-item"
								}
								aria-pressed={candidate.id === unit.id}
								onClick={() => {
									return setUnit(candidate);
								}}
							>
								<img src={candidate.image} alt={candidate.imageAlt} />
							</button>
						);
					})}
				</div>
			</section>

			<section>
				<a
					href={shareUrl(balanceYen, unit, balanceText)}
					target="_blank"
					rel="noopener noreferrer"
				>
					醜態を晒す
				</a>
			</section>
		</div>
	);
};
