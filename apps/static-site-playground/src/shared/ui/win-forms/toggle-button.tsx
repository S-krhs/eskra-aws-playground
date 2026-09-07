// In scope: the Windows-Forms-style button that stays pressed
// Out of scope: deciding which one is pressed, what goes on the button

import type { ReactNode } from "react";

interface Props {
	pressed: boolean;
	onPress: () => void;
	children: ReactNode;
}

/** Stays sunken while selected — the toolbar toggle button */
export const ToggleButton = ({ pressed, onPress, children }: Props) => {
	// The sunken and raised looks stay exclusive. With both applied, which one wins is decided by
	// the order in the generated CSS rather than the order in className.
	const bevelClasses = pressed
		? "bevel-sunken bg-face-pressed bg-[repeating-conic-gradient(#ffffff_0%_25%,#a0a0a0_0%_50%)] bg-size-[4px_4px]"
		: "bevel-raised bg-face";

	return (
		<button
			type="button"
			className={`cursor-pointer select-none p-[3px] leading-none focus-visible:outline-dotted focus-visible:outline-1 focus-visible:outline-black focus-visible:-outline-offset-4 ${bevelClasses}`}
			aria-pressed={pressed}
			onClick={onPress}
		>
			{children}
		</button>
	);
};
