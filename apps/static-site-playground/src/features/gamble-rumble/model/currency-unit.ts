// In scope: the type and list of currency units a balance is shown in
// Out of scope: converting to and from yen, building the display string, the unit-picker UI

/** A currency unit a balance is shown in; `yenPerUnit` is the yen one unit is worth */
export interface CurrencyUnit {
	id: "yen" | "wf" | "dcu";
	label: string;
	yenPerUnit: number;
	image: string;
	imageAlt: string;
}

/** The selectable units; this order is the order they appear in the switcher */
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
