// In scope: 収支と選択中の単位を保持し、gamble-rumble の窓として feature を組み立てる
// Out of scope: 収支の表示や換算の実装、ボタン・リンクそれぞれの中身

import { useState } from "react";
import { BalanceDisplay } from "@/entities/balance/ui/balance-display.js";
import { OverLimitCaution } from "@/entities/balance/ui/over-limit-caution.js";
import { formatBalance } from "@/entities/currency-unit/lib/format-balance.js";
import { currencyUnits } from "@/entities/currency-unit/model/currency-unit.js";
import { ExpenseButtons } from "@/features/adjust-balance/ui/expense-buttons.js";
import { UnitSelect } from "@/features/select-currency-unit/ui/unit-select.js";
import { ShareLink } from "@/features/share-balance/ui/share-link.js";
import { GroupBox } from "@/shared/ui/win-forms/group-box.js";
import { Window } from "@/shared/ui/win-forms/window.js";

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
			<OverLimitCaution balanceYen={balanceYen} />

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
				<UnitSelect selected={unit} onSelect={setUnit} />
			</GroupBox>

			<div className="flex justify-end">
				<ShareLink balanceYen={balanceYen} unit={unit} />
			</div>
		</Window>
	);
};
