// In scope: 収支と選択中の単位を保持し、gamble-rumble の窓として feature を組み立てる
// Out of scope: 収支の表示や換算の実装、ボタン・リンクそれぞれの中身

import { useState } from "react";
import { BalanceDisplay } from "@/entities/balance/ui/balance-display.js";
import { OverLimitCaution } from "@/entities/balance/ui/over-limit-caution.js";
import { currencyUnits } from "@/entities/currency-unit/model/currency-unit.js";
import { ExpenseButtons } from "@/features/adjust-balance/ui/expense-buttons.js";
import { UnitSelect } from "@/features/select-currency-unit/ui/unit-select.js";
import { ShareLink } from "@/features/share-balance/ui/share-link.js";
import "@/shared/ui/win-forms/win-forms.css";
import "./gamble-rumble.css";

/** 収支を賭けの単位で積み上げ、ツイートで晒すところまでを担う island */
export const GambleRumble = () => {
	const [balanceYen, setBalanceYen] = useState(-20000);
	const [unit, setUnit] = useState(currencyUnits[0]);

	return (
		<div className="winforms-window">
			<div className="winforms-title-bar">
				<span aria-hidden="true">▣</span>
				<h1>gamble-rumble</h1>
				<span className="winforms-title-bar-controls" aria-hidden="true">
					<span className="winforms-title-bar-button">─</span>
					<span className="winforms-title-bar-button">□</span>
					<span className="winforms-title-bar-button">✕</span>
				</span>
			</div>

			<div className="winforms-window-body">
				<OverLimitCaution balanceYen={balanceYen} />

				<fieldset className="winforms-group-box">
					<legend>収支</legend>
					<BalanceDisplay balanceYen={balanceYen} unit={unit} />
				</fieldset>

				<fieldset className="winforms-group-box">
					<legend>投資・回収</legend>
					<ExpenseButtons
						onAdjust={(stepYen) => {
							return setBalanceYen(balanceYen + stepYen);
						}}
					/>
				</fieldset>

				<fieldset className="winforms-group-box">
					<legend>単位</legend>
					<UnitSelect selected={unit} onSelect={setUnit} />
				</fieldset>

				<div className="gamble-rumble-actions">
					<ShareLink balanceYen={balanceYen} unit={unit} />
				</div>
			</div>

			<div className="winforms-status-bar">
				<span className="winforms-status-bar-field">単位: {unit.label}</span>
				<span className="winforms-status-bar-field">
					{`${balanceYen.toLocaleString("ja-JP")}円`}
				</span>
			</div>
		</div>
	);
};
