// In scope: 通貨単位を画像ボタンで選ばせる
// Out of scope: 単位の定義、選択中の単位の保持、換算

import type { CurrencyUnit } from "@/entities/currency-unit/model/currency-unit.js";
import { currencyUnits } from "@/entities/currency-unit/model/currency-unit.js";
import "./unit-select.css";

interface Props {
	selected: CurrencyUnit;
	onSelect: (unit: CurrencyUnit) => void;
}

/** 通貨単位の画像ボタン列。選択中のものは押し込まれた見た目になる */
export const UnitSelect = ({ selected, onSelect }: Props) => {
	return (
		<div className="unit-select">
			{currencyUnits.map((unit) => {
				const isSelected = unit.id === selected.id;
				return (
					<button
						key={unit.id}
						type="button"
						className={
							isSelected ? "unit-select-item selected" : "unit-select-item"
						}
						aria-pressed={isSelected}
						onClick={() => {
							return onSelect(unit);
						}}
					>
						<img src={unit.image} alt={unit.imageAlt} />
					</button>
				);
			})}
		</div>
	);
};
