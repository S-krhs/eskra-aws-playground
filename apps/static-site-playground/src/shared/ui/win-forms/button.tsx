// In scope: the Windows-Forms-style push button
// Out of scope: what happens on press, a button that opens as a link

import type { ReactNode } from "react";

interface Props {
	onPress: () => void;
	children: ReactNode;
}

/** A push button with a raised bevel that sinks while held */
export const Button = ({ onPress, children }: Props) => {
	return (
		<button
			type="button"
			className="bevel-raised active:bevel-sunken min-w-22 cursor-pointer bg-face px-3 py-[5px] text-center text-black focus-visible:outline-dotted focus-visible:outline-1 focus-visible:outline-black focus-visible:-outline-offset-4 active:pt-1.5 active:pr-[11px] active:pb-1 active:pl-[13px]"
			onClick={onPress}
		>
			{children}
		</button>
	);
};
