// In scope: the row of buttons moving the balance up and down
// Out of scope: holding the balance, showing it afterwards

import { Button } from "@/shared/ui/win-forms";
import { expenseSteps } from "../model/expense-steps.js";

interface Props {
	onAdjust: (stepYen: number) => void;
}

/** The spend/recover button row; hands the pressed amount up in yen */
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
