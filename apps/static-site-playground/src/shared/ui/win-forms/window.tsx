// In scope: Windows Forms 風の窓の枠と、最小化・最大化・閉じる・移動の操作
// Out of scope: 窓に載せる中身、業務上の意味を持つ表示

import {
	type ReactNode,
	type PointerEvent as ReactPointerEvent,
	useRef,
	useState,
} from "react";

/** 窓の表示状態。閉じたら中身ごと描画しない */
type WindowState = "normal" | "minimized" | "maximized" | "closed";

/** 画面外へ出しきらないよう、掴める幅と高さをこれだけ残す */
const grabMargin = 80;
const titleBarHeight = 24;

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
			className={`bevel-raised grid h-[15px] w-[17px] place-items-center bg-face text-[9px] leading-none ${
				disabled
					? "cursor-default text-bevel-shadow [text-shadow:1px_1px_0_#ffffff]"
					: "active:bevel-sunken cursor-pointer text-black"
			}`}
			aria-label={label}
			disabled={disabled}
			onClick={onPress}
		>
			<span aria-hidden="true">{glyph}</span>
		</button>
	);
};

/** 窓の枠。最小化すると左下の小さなバーになり、閉じると何も描画しなくなる */
export const Window = ({
	title,
	statusFields,
	maximizable = false,
	children,
}: {
	title: string;
	statusFields: readonly string[];
	/** 最大化ボタンを押せるようにするか。false のときは押せない見た目で出す */
	maximizable?: boolean;
	children: ReactNode;
}) => {
	const [state, setState] = useState<WindowState>("normal");
	const [position, setPosition] = useState<{ x: number; y: number } | null>(
		null,
	);
	const frameRef = useRef<HTMLDivElement>(null);
	const drag = useRef<{
		offsetX: number;
		offsetY: number;
		width: number;
	} | null>(null);

	if (state === "closed") {
		return null;
	}

	const isMinimized = state === "minimized";
	const isMaximized = state === "maximized";
	const isDraggable = !isMinimized && !isMaximized;

	const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
		const frame = frameRef.current;
		if (event.button !== 0 || !frame) {
			return;
		}
		// ボタンを押したときは掴まない
		if (event.target instanceof Element && event.target.closest("button")) {
			return;
		}
		const rect = frame.getBoundingClientRect();
		drag.current = {
			offsetX: event.clientX - rect.left,
			offsetY: event.clientY - rect.top,
			width: rect.width,
		};
		setPosition({ x: rect.left, y: rect.top });
		event.currentTarget.setPointerCapture(event.pointerId);
	};

	const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
		const held = drag.current;
		if (!held) {
			return;
		}
		const x = Math.min(
			Math.max(event.clientX - held.offsetX, grabMargin - held.width),
			window.innerWidth - grabMargin,
		);
		const y = Math.min(
			Math.max(event.clientY - held.offsetY, 0),
			window.innerHeight - titleBarHeight,
		);
		setPosition({ x, y });
	};

	const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
		drag.current = null;
		event.currentTarget.releasePointerCapture(event.pointerId);
	};

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

	const titleBar = (
		<div
			className={`flex touch-none select-none items-center gap-1 bg-linear-90 from-title-bar-start to-title-bar-end py-1 pr-0.5 pl-1 text-white ${isDraggable ? "cursor-move" : ""}`}
			onPointerDown={isDraggable ? startDrag : undefined}
			onPointerMove={isDraggable ? moveDrag : undefined}
			onPointerUp={isDraggable ? endDrag : undefined}
			onPointerCancel={isDraggable ? endDrag : undefined}
		>
			<span aria-hidden="true">▣</span>
			<h1 className="flex-1 truncate font-bold text-[13px] leading-4 tracking-[0.02em]">
				{title}
			</h1>
			<span className="flex gap-0.5">{controls}</span>
		</div>
	);

	const frameClasses =
		"bevel-raised bg-face p-[3px] font-ui text-black text-xs shadow-[3px_3px_8px_rgb(0_0_0/40%)]";

	if (isMinimized) {
		return (
			// biome-ignore lint/a11y/noStaticElementInteractions: ダブルクリックは復元ボタンの補助で、同じ操作は「元のサイズに戻す」ボタンから行える
			<div
				className={`${frameClasses} fixed bottom-3 left-3 z-10 w-60`}
				onDoubleClick={(event) => {
					if (
						event.target instanceof Element &&
						event.target.closest("button")
					) {
						return;
					}
					return setState("normal");
				}}
			>
				{titleBar}
			</div>
		);
	}

	const isMoved = position !== null && !isMaximized;

	return (
		<div
			ref={frameRef}
			className={
				isMaximized
					? `${frameClasses} fixed inset-0 z-10 flex flex-col overflow-hidden`
					: isMoved
						? `${frameClasses} fixed z-10 w-[min(45rem,calc(100vw-2rem))]`
						: `${frameClasses} mx-auto max-w-180`
			}
			style={isMoved ? { left: position.x, top: position.y } : undefined}
		>
			{titleBar}

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
