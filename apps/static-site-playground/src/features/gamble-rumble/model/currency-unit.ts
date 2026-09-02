// In scope: 収支を表す通貨単位の型と一覧
// Out of scope: 円との換算、表示文字列の組み立て、単位の選択 UI

/** 収支を表す通貨単位。`yenPerUnit` は 1 単位あたりの円 */
export interface CurrencyUnit {
	id: "yen" | "wf" | "dcu";
	label: string;
	yenPerUnit: number;
	image: string;
	imageAlt: string;
}

/** 選択できる通貨単位。表示順はそのまま単位切り替えの並び順になる */
export const currencyUnits: readonly CurrencyUnit[] = [
	{
		id: "yen",
		label: "円",
		yenPerUnit: 1,
		image: "/pic/gamble-rumble/yen.jpg",
		imageAlt: "1円玉",
	},
	{
		id: "wf",
		label: "ｳｪﾌｧｰ",
		yenPerUnit: 200,
		image: "/pic/gamble-rumble/wf.jpg",
		imageAlt: "ｳｪﾌｧｰ",
	},
	{
		id: "dcu",
		label: "どきゅーと",
		yenPerUnit: 66000,
		image: "/pic/gamble-rumble/dcu.jpg",
		imageAlt: "どきゅーと",
	},
];
