// In scope: Windows Forms 風の GroupBox（見出し付きの囲み）
// Out of scope: 囲みに入れる中身

import type { ReactNode } from "react";

interface Props {
	label: string;
	children: ReactNode;
}

/** 見出し付きの囲み。見出しは枠線の上に重なって出る */
export const GroupBox = ({ label, children }: Props) => {
	return (
		<fieldset className="bevel-etched mb-3 p-3">
			<legend className="px-1">{label}</legend>
			{children}
		</fieldset>
	);
};
