// In scope: Windows Forms 風の窓（タイトルバー・本文・ステータスバー）の枠
// Out of scope: 窓に載せる中身、業務上の意味を持つ表示

import type { ReactNode } from "react";

interface Props {
	title: string;
	statusFields: readonly string[];
	children: ReactNode;
}

/** 窓の枠。タイトルバーの最小化・最大化・閉じるは飾りで、操作はできない */
export const Window = ({ title, statusFields, children }: Props) => {
	return (
		<div className="bevel-raised mx-auto max-w-180 bg-face p-[3px] font-ui text-black text-xs shadow-[3px_3px_8px_rgb(0_0_0/40%)]">
			<div className="flex items-center gap-1 bg-linear-90 from-title-bar-start to-title-bar-end py-0.5 pr-0.5 pl-1 text-white">
				<span aria-hidden="true">▣</span>
				<h1 className="flex-1 font-bold text-xs">{title}</h1>
				<span className="flex gap-0.5" aria-hidden="true">
					{["─", "□", "✕"].map((glyph) => {
						return (
							<span
								key={glyph}
								className="bevel-raised grid h-[15px] w-[17px] place-items-center bg-face text-[9px] text-black leading-none"
							>
								{glyph}
							</span>
						);
					})}
				</span>
			</div>

			<div className="p-3">{children}</div>

			<div className="flex gap-0.5 p-0.5">
				{statusFields.map((field, index) => {
					return (
						<span
							key={field}
							className={`bevel-etched px-1.5 py-[3px] ${index === 0 ? "flex-1" : ""}`}
						>
							{field}
						</span>
					);
				})}
			</div>
		</div>
	);
};
