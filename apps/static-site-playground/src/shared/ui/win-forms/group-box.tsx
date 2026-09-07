// In scope: the Windows-Forms-style GroupBox (a labelled frame)
// Out of scope: what goes inside the frame

import type { ReactNode } from "react";

interface Props {
	label: string;
	children: ReactNode;
}

/** A labelled frame; the label sits over the border line */
export const GroupBox = ({ label, children }: Props) => {
	return (
		<fieldset className="bevel-etched mb-3 p-3">
			<legend className="px-1">{label}</legend>
			{children}
		</fieldset>
	);
};
