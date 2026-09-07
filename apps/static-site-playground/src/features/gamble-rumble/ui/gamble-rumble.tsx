// In scope: holding the balance and the selected unit, and assembling the window's contents
// Out of scope: how the balance is displayed or converted, what the spend/recover buttons do

import { useState } from "react";
import {
	GroupBox,
	LinkButton,
	ToggleButton,
	Window,
} from "@/shared/ui/win-forms";
import { formatBalance } from "../lib/format-balance.js";
import { shareUrl } from "../lib/share-url.js";
import { cautionYen, rainbowYen } from "../model/balance-thresholds.js";
import { currencyUnits } from "../model/currency-unit.js";
import { shareText } from "../model/share-text.js";
import { BalanceDisplay, type BalanceTone } from "./balance-display.js";
import { ExpenseButtons } from "./expense-buttons.js";
import { OverLimitCaution } from "./over-limit-caution.js";

/** The island that stacks a balance up in betting units and gets it as far as a tweet */
export const GambleRumble = () => {
	const [balanceYen, setBalanceYen] = useState(-20000);
	const [unit, setUnit] = useState(currencyUnits[0]);

	const tone: BalanceTone =
		balanceYen >= rainbowYen ? "jackpot" : balanceYen < 0 ? "loss" : "normal";

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
				<BalanceDisplay tone={tone} text={formatBalance(balanceYen, unit)} />
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
