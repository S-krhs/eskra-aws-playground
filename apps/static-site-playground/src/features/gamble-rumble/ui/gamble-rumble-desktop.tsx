// In scope: gamble-rumble をアイコンとして置いたデスクトップ。ページが載せる island
// Out of scope: デスクトップの枠組み、窓の中身

import { Desktop } from "@/shared/ui/win-forms";
import { GambleRumble } from "./gamble-rumble.js";

/** アイコンをダブルクリックするたび、収支を独立して持つ窓が増える */
export const GambleRumbleDesktop = () => {
	return (
		<Desktop
			icons={[
				{
					id: "gamble-rumble",
					label: "gamble-rumble",
					image: "/pic/gamble-rumble/yen.jpg",
					imageAlt: "gamble-rumble",
					render: () => {
						return <GambleRumble />;
					},
				},
			]}
		/>
	);
};
