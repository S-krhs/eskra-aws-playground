// In scope: 収支と選択中の単位を保持し、窓の中身を組み立てる
// Out of scope: 収支の表示や換算の実装、投資・回収ボタンの中身

import { useState } from "react";
import {
	GroupBox,
	LinkButton,
	ToggleButton,
	Window,
} from "@/shared/ui/win-forms";
import { formatBalance } from "../lib/format-balance.js";
import { shareUrl } from "../lib/share-url.js";
import { cautionYen } from "../model/balance-thresholds.js";
import { currencyUnits } from "../model/currency-unit.js";
import { shareText } from "../model/share-text.js";
import { BalanceDisplay } from "./balance-display.js";
import { ExpenseButtons } from "./expense-buttons.js";
import { OverLimitCaution } from "./over-limit-caution.js";

/** 収支を賭けの単位で積み上げ、ツイートで晒すところまでを担う island */
export const GambleRumble = () => {
	const [balanceYen, setBalanceYen] = useState(-20000);
	const [unit, setUnit] = useState(currencyUnits[0]);

	return (
		<Window
			title="gamble-rumble"
			statusFields={[
				`単位: ${unit.label}`,
				`${balanceYen.toLocaleString("ja-JP")}円`,
			]}
		>
			{balanceYen <= cautionYen && <OverLimitCaution />}

			<GroupBox label="収支">
				<BalanceDisplay
					balanceYen={balanceYen}
					text={formatBalance(balanceYen, unit)}
				/>
			</GroupBox>

			<GroupBox label="投資・回収">
				<ExpenseButtons
					onAdjust={(stepYen) => {
						return setBalanceYen(balanceYen + stepYen);
					}}
				/>
			</GroupBox>

			<GroupBox label="単位">
				<div className="flex flex-wrap gap-2">
					{currencyUnits.map((candidate) => {
						return (
							<ToggleButton
								key={candidate.id}
								pressed={candidate.id === unit.id}
								onPress={() => {
									return setUnit(candidate);
								}}
							>
								<img
									className="block h-auto w-24 md:w-40"
									src={candidate.image}
									alt={candidate.imageAlt}
								/>
							</ToggleButton>
						);
					})}
				</div>
			</GroupBox>

			<div className="flex justify-end">
				<LinkButton href={shareUrl(shareText(balanceYen, unit))}>
					醜態を晒す
				</LinkButton>
			</div>
		</Window>
	);
};
