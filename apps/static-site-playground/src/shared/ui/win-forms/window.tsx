// In scope: Windows Forms 風の窓の枠と、最小化・最大化・閉じるの操作
// Out of scope: 窓に載せる中身、業務上の意味を持つ表示

import { type ReactNode, useState } from "react";

/** 窓の表示状態。閉じたら中身ごと描画しない */
type WindowState = "normal" | "minimized" | "maximized" | "closed";

const ControlButton = ({
	label,
	glyph,
	disabled,
	onPress,
}: {
	label: string;
	glyph: string;
	disabled?: boolean;
	onPress: () => void;
}) => {
	return (
		<button
			type="button"
			className="bevel-raised active:bevel-sunken grid h-[15px] w-[17px] cursor-pointer place-items-center bg-face text-[9px] text-black leading-none disabled:cursor-default disabled:text-bevel-shadow"
			aria-label={label}
			disabled={disabled}
			onClick={onPress}
		>
			<span aria-hidden="true">{glyph}</span>
		</button>
	);
};

const TitleBar = ({
	title,
	controls,
}: {
	title: string;
	controls: ReactNode;
}) => {
	return (
		<div className="flex items-center gap-1 bg-linear-90 from-title-bar-start to-title-bar-end py-1 pr-0.5 pl-1 text-white">
			<span aria-hidden="true">▣</span>
			<h1 className="flex-1 truncate font-bold text-[13px] leading-4 tracking-[0.02em]">
				{title}
			</h1>
			<span className="flex gap-0.5">{controls}</span>
		</div>
	);
};

interface Props {
	title: string;
	statusFields: readonly string[];
	/** 最大化ボタンを押せるようにするか。false のときは押せない見た目で出す */
	maximizable?: boolean;
	children: ReactNode;
}

/** 窓の枠。最小化すると左下の小さなバーになり、閉じると何も描画しなくなる */
export const Window = ({
	title,
	statusFields,
	maximizable = false,
	children,
}: Props) => {
	const [state, setState] = useState<WindowState>("normal");

	if (state === "closed") {
		return null;
	}

	const isMinimized = state === "minimized";
	const isMaximized = state === "maximized";

	const controls = (
		<>
			{isMinimized ? (
				<ControlButton
					label="元のサイズに戻す"
					glyph="❐"
					onPress={() => {
						return setState("normal");
					}}
				/>
			) : (
				<ControlButton
					label="最小化"
					glyph="─"
					onPress={() => {
						return setState("minimized");
					}}
				/>
			)}
			<ControlButton
				label={isMaximized ? "元のサイズに戻す" : "最大化"}
				glyph={isMaximized ? "❐" : "□"}
				disabled={!maximizable}
				onPress={() => {
					return setState(isMaximized ? "normal" : "maximized");
				}}
			/>
			<ControlButton
				label="閉じる"
				glyph="✕"
				onPress={() => {
					return setState("closed");
				}}
			/>
		</>
	);

	const frameClasses =
		"bevel-raised bg-face p-[3px] font-ui text-black text-xs shadow-[3px_3px_8px_rgb(0_0_0/40%)]";

	if (isMinimized) {
		return (
			<div className={`${frameClasses} fixed bottom-3 left-3 z-10 w-60`}>
				<TitleBar title={title} controls={controls} />
			</div>
		);
	}

	return (
		<div
			className={
				isMaximized
					? `${frameClasses} fixed inset-0 z-10 flex flex-col overflow-hidden`
					: `${frameClasses} mx-auto max-w-180`
			}
		>
			<TitleBar title={title} controls={controls} />

			<div className={isMaximized ? "flex-1 overflow-auto p-3" : "p-3"}>
				{children}
			</div>

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
