// In scope: 通貨単位を画像ボタンで選ばせる
// Out of scope: 単位の定義と見た目、選択中の単位の保持、換算

import type { CurrencyUnit } from "@/entities/currency-unit/model/currency-unit.js";
import { currencyUnits } from "@/entities/currency-unit/model/currency-unit.js";
import { CurrencyUnitImage } from "@/entities/currency-unit/ui/currency-unit-image.js";
import { ToggleButton } from "@/shared/ui/win-forms/toggle-button.js";

interface Props {
	selected: CurrencyUnit;
	onSelect: (unit: CurrencyUnit) => void;
}

/** 通貨単位の画像ボタン列。選択中のものは押し込まれた見た目になる */
export const UnitSelect = ({ selected, onSelect }: Props) => {
	return (
		<div className="flex flex-wrap gap-2">
			{currencyUnits.map((unit) => {
				return (
					<ToggleButton
						key={unit.id}
						pressed={unit.id === selected.id}
						onPress={() => {
							return onSelect(unit);
						}}
					>
						<CurrencyUnitImage unit={unit} />
					</ToggleButton>
				);
			})}
		</div>
	);
};
