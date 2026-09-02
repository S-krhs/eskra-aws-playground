// In scope: gamble-rumble で収支を表す通貨単位の定義と、円建て収支の表示文字列への変換
// Out of scope: 収支の状態管理、UI の組み立て、ツイート文面

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

/**
 * 円建ての収支を選択中の単位へ換算し、有効数字 3 桁の表示文字列にする。
 * 先頭は必ず符号 1 文字になる（負は `-`、0 と正は `+`）。
 */
export const formatBalance = (yen: number, unit: CurrencyUnit): string => {
	const amount = (yen / unit.yenPerUnit).toLocaleString("ja-JP", {
		maximumSignificantDigits: 3,
	});
	return yen < 0 ? amount : `+${amount}`;
};
