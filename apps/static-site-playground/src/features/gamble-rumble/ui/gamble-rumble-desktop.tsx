// In scope: the desktop holding gamble-rumble as an icon — the island a page drops in
// Out of scope: the desktop framework, a window's contents

import { Desktop } from "@/shared/ui/win-forms";
import { GambleRumble } from "./gamble-rumble.js";

/** Every double click on the icon opens another window holding its own balance */
export const GambleRumbleDesktop = () => {
	return (
		<Desktop
			icons={[
				{
					id: "gamble-rumble",
					label: "gamble-rumble",
					image: "/pic/gamble-rumble/dcu.jpg",
					imageAlt: "gamble-rumble",
					render: () => {
						return <GambleRumble />;
					},
				},
			]}
		/>
	);
};
