// In scope: 通貨単位を表す画像
// Out of scope: 単位の選択、単位の定義

import type { CurrencyUnit } from "@/entities/currency-unit/model/currency-unit.js";

interface Props {
	unit: CurrencyUnit;
}

/** 通貨単位の見た目。単位そのものを表す画像を出す */
export const CurrencyUnitImage = ({ unit }: Props) => {
	return (
		<img
			className="block h-auto w-24 md:w-40"
			src={unit.image}
			alt={unit.imageAlt}
		/>
	);
};
