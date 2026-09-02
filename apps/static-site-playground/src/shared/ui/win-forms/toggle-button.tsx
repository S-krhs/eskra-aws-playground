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
	// 押し込み側と浮き側は排他にする。両方付けると、どちらが効くかが
	// className の並びではなく生成 CSS の記述順で決まってしまう。
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
