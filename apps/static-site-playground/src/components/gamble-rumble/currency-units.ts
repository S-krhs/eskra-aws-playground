// In scope: gamble-rumble で収支を表す通貨単位の定義と、円との換算
// Out of scope: 収支の状態管理、表示の組み立て、ツイート文面

/** 収支を表す通貨単位。`step` は投資・回収ボタン 1 回分の量で、単位ごとに扱いやすい刻みを持つ */
export interface CurrencyUnit {
	id: "yen" | "wf" | "dcu";
	label: string;
	yenPerUnit: number;
	step: number;
	image: string;
	imageAlt: string;
}

/** 選択できる通貨単位。表示順はそのまま単位切り替えの並び順になる */
export const currencyUnits: readonly CurrencyUnit[] = [
	{
		id: "yen",
		label: "円",
		yenPerUnit: 1,
		step: 1000,
		image: "/pic/gamble-rumble/yen.jpg",
		imageAlt: "1円玉",
	},
	{
		id: "wf",
		label: "ｳｪﾌｧｰ",
		yenPerUnit: 200,
		step: 1,
		image: "/pic/gamble-rumble/wf.jpg",
		imageAlt: "ｳｪﾌｧｰ",
	},
	{
		id: "dcu",
		label: "どきゅーと",
		yenPerUnit: 66000,
		step: 1,
		image: "/pic/gamble-rumble/dcu.jpg",
		imageAlt: "どきゅーと",
	},
];

/** 円で持っている収支を、指定した単位の量へ換算する。端数は四捨五入し、`-0` は `0` に寄せる */
export const toUnitAmount = (yen: number, unit: CurrencyUnit): number => {
	const amount = Math.round(yen / unit.yenPerUnit);
	return amount === 0 ? 0 : amount;
};

/** 単位付きの表示文字列を作る。3 桁区切りを入れ、正の量には `+` を付ける */
export const formatUnitAmount = (
	amount: number,
	unit: CurrencyUnit,
): string => {
	const sign = amount > 0 ? "+" : "";
	return `${sign}${amount.toLocaleString("ja-JP")}${unit.label}`;
};
