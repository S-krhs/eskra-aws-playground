// In scope: Windows Forms 風の押しボタン
// Out of scope: 押されたときの処理、リンクとして開くボタン

import type { ReactNode } from "react";

interface Props {
	onPress: () => void;
	children: ReactNode;
}

/** 立体的な枠を持つ押しボタン。押している間は枠がへこむ */
export const Button = ({ onPress, children }: Props) => {
	return (
		<button
			type="button"
			className="bevel-raised min-w-22 cursor-pointer bg-face px-3 py-[5px] text-center text-black active:bevel-sunken active:pt-1.5 active:pr-[11px] active:pb-1 active:pl-[13px] focus-visible:outline-1 focus-visible:-outline-offset-4 focus-visible:outline-dotted focus-visible:outline-black"
			onClick={onPress}
		>
			{children}
		</button>
	);
};
