// In scope: アイコンを並べ、ダブルクリックで窓を増やすデスクトップ
// Out of scope: 窓の中身、窓の枠そのものの描画

import { type ReactNode, useRef, useState } from "react";
import { WindowHostContext } from "./window-host.js";

/** デスクトップに置くアイコン。`render` は開いた窓 1 枚分を描く */
export interface DesktopIcon {
	id: string;
	label: string;
	image: string;
	imageAlt: string;
	render: () => ReactNode;
}

interface OpenWindow {
	key: number;
	iconId: string;
	cascadeIndex: number;
}

/**
 * アイコンを左上に並べ、ダブルクリック（キーボードなら Enter / Space）で
 * 窓を増やす。最初の 1 枚は最初のアイコンのものを開いた状態で始める。
 */
export const Desktop = ({ icons }: { icons: readonly DesktopIcon[] }) => {
	const firstIcon = icons[0];
	const [windows, setWindows] = useState<OpenWindow[]>(
		firstIcon ? [{ key: 0, iconId: firstIcon.id, cascadeIndex: 0 }] : [],
	);
	// 手前に来た順。末尾ほど手前。描画順は開いた順のまま動かさない。
	// 並べ替えると DOM が動き、押している最中のクリックが取りこぼされる。
	const [zOrder, setZOrder] = useState<number[]>(firstIcon ? [0] : []);
	// 最小化した順。下辺に並べる位置をここで決める
	const [minimizedKeys, setMinimizedKeys] = useState<number[]>([]);
	const nextKey = useRef(1);
	const nextCascade = useRef(1);

	const open = (iconId: string) => {
		const key = nextKey.current;
		nextKey.current += 1;
		const cascadeIndex = nextCascade.current % 8;
		nextCascade.current += 1;
		setWindows((current) => {
			return [...current, { key, iconId, cascadeIndex }];
		});
		setZOrder((current) => {
			return [...current, key];
		});
	};

	const forget = (key: number) => {
		setWindows((current) => {
			return current.filter((candidate) => {
				return candidate.key !== key;
			});
		});
		setMinimizedKeys((current) => {
			return current.filter((candidate) => {
				return candidate !== key;
			});
		});
		setZOrder((current) => {
			return current.filter((candidate) => {
				return candidate !== key;
			});
		});
	};

	return (
		<>
			<div className="flex w-24 flex-col gap-4">
				{icons.map((icon) => {
					return (
						<button
							key={icon.id}
							type="button"
							className="flex cursor-pointer select-none flex-col items-center gap-1 border border-transparent p-1 text-white focus-visible:border-white focus-visible:border-dotted"
							onDoubleClick={() => {
								return open(icon.id);
							}}
							onKeyDown={(event) => {
								if (event.key === "Enter" || event.key === " ") {
									event.preventDefault();
									open(icon.id);
								}
							}}
						>
							<img
								className="bevel-raised size-12 bg-face p-0.5"
								src={icon.image}
								alt=""
							/>
							<span className="font-ui text-xs [text-shadow:1px_1px_2px_#000000]">
								{icon.label}
							</span>
						</button>
					);
				})}
			</div>

			{windows.map((entry) => {
				const icon = icons.find((candidate) => {
					return candidate.id === entry.iconId;
				});
				if (!icon) {
					return null;
				}
				return (
					<WindowHostContext.Provider
						key={entry.key}
						value={{
							zIndex: 10 + zOrder.indexOf(entry.key),
							cascadeIndex: entry.cascadeIndex,
							minimizedSlot: minimizedKeys.indexOf(entry.key),
							onClose: () => {
								return forget(entry.key);
							},
							onFocus: () => {
								return setZOrder((current) => {
									if (current[current.length - 1] === entry.key) {
										return current;
									}
									return [
										...current.filter((candidate) => {
											return candidate !== entry.key;
										}),
										entry.key,
									];
								});
							},
							onMinimizedChange: (minimized: boolean) => {
								return setMinimizedKeys((current) => {
									if (!minimized) {
										return current.filter((candidate) => {
											return candidate !== entry.key;
										});
									}
									return current.includes(entry.key)
										? current
										: [...current, entry.key];
								});
							},
						}}
					>
						{icon.render()}
					</WindowHostContext.Provider>
				);
			})}
		</>
	);
};
