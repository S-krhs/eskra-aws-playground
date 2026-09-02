// In scope: 収支を増減させるボタン列
// Out of scope: 収支の保持、増減後の表示

import { Button } from "@/shared/ui/win-forms";
import { expenseSteps } from "../model/expense-steps.js";

interface Props {
	onAdjust: (stepYen: number) => void;
}

/** 投資・回収のボタン列。押された額を円で親へ渡す */
export const ExpenseButtons = ({ onAdjust }: Props) => {
	return (
		<div className="flex flex-wrap gap-2">
			{expenseSteps.map((step) => {
				return (
					<Button
						key={step}
						onPress={() => {
							return onAdjust(step);
						}}
					>
						{`${step > 0 ? "+" : ""}${step}円`}
					</Button>
				);
			})}
		</div>
	);
};
