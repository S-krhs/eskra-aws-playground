// In scope: 押した状態を保つ Windows Forms 風のボタン
// Out of scope: どれを押した状態にするかの判断、ボタンに載せる中身

import type { ReactNode } from "react";

interface Props {
	pressed: boolean;
	onPress: () => void;
	children: ReactNode;
}

/** 選択中は押し込まれたままになるボタン。ツールバーの切り替えボタンに相当する */
export const ToggleButton = ({ pressed, onPress, children }: Props) => {
	const pressedClasses =
		"bevel-sunken bg-face-pressed bg-[repeating-conic-gradient(#ffffff_0%_25%,#a0a0a0_0%_50%)] bg-size-[4px_4px]";

	return (
		<button
			type="button"
			className={`bevel-raised cursor-pointer bg-face p-[3px] leading-none select-none focus-visible:outline-1 focus-visible:-outline-offset-4 focus-visible:outline-dotted focus-visible:outline-black ${pressed ? pressedClasses : ""}`}
			aria-pressed={pressed}
			onClick={onPress}
		>
			{children}
		</button>
	);
};
