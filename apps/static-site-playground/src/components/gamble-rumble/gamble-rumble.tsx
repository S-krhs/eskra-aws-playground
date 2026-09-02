// In scope: 賭博の収支を記録し、選んだ通貨単位で表示してツイート文面を用意する UI
// Out of scope: 通貨単位の定義と円換算、収支の永続化、ページ全体の骨組み

import { useState } from "react";
import {
	type CurrencyUnit,
	currencyUnits,
	formatUnitAmount,
	toUnitAmount,
} from "./currency-units.js";
import "./gamble-rumble.css";

/** 投資・回収ボタンの並び。単位ごとの `step` に対する倍率で、左から順に表示する */
const stepMultipliers = [-10, -1, 1, 10];

/** 収支を「大体N単位分負けました」の文面にして、X の投稿画面を開く URL を作る */
const shareUrl = (amount: number, unit: CurrencyUnit): string => {
	const result =
		amount === 0
			? "トントンでした。"
			: `大体${Math.abs(amount).toLocaleString("ja-JP")}${unit.label}分${amount < 0 ? "負けました" : "勝ちました"}。`;
	return `https://x.com/intent/post?text=${encodeURIComponent(`${result}\n#sasaharaUK`)}`;
};

/** 収支を賭けの単位で積み上げ、ツイートで晒すところまでを担う island */
export const GambleRumble = () => {
	const [balanceYen, setBalanceYen] = useState(0);
	const [unit, setUnit] = useState(currencyUnits[0]);

	const amount = toUnitAmount(balanceYen, unit);

	return (
		<div className="gamble-rumble">
			<h2>収支</h2>
			<p className={amount < 0 ? "balance is-loss" : "balance"}>
				{formatUnitAmount(amount, unit)}
			</p>

			<h2>投資・回収</h2>
			<div className="steps">
				{stepMultipliers.map((multiplier) => {
					const stepYen = unit.step * multiplier * unit.yenPerUnit;
					const sign = multiplier > 0 ? "+" : "-";
					return (
						<button
							key={multiplier}
							type="button"
							onClick={() => {
								return setBalanceYen(balanceYen + stepYen);
							}}
						>
							{`${sign}${unit.step * Math.abs(multiplier)}${unit.label}`}
						</button>
					);
				})}
			</div>

			<div className="units">
				{currencyUnits.map((candidate) => {
					return (
						<button
							key={candidate.id}
							type="button"
							className={candidate.id === unit.id ? "is-selected" : undefined}
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

			<a href={shareUrl(amount, unit)} target="_blank" rel="noreferrer">
				醜態を晒す
			</a>
		</div>
	);
};
