// In scope: 収支を増減させるボタン列
// Out of scope: 収支の保持、増減後の表示

import { expenseSteps } from "@/features/adjust-balance/model/expense-steps.js";
import "./expense-buttons.css";

interface Props {
	onAdjust: (stepYen: number) => void;
}

/** 投資・回収のボタン列。押された額を円で親へ渡す */
export const ExpenseButtons = ({ onAdjust }: Props) => {
	return (
		<div className="expense-buttons">
			{expenseSteps.map((step) => {
				return (
					<button
						key={step}
						type="button"
						className="winforms-button"
						onClick={() => {
							return onAdjust(step);
						}}
					>
						{`${step > 0 ? "+" : ""}${step}円`}
					</button>
				);
			})}
		</div>
	);
};
