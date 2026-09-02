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

/** 同じアイコンをこの間隔以内に 2 回押したら、ダブルクリックとみなす */
const doubleClickMs = 500;

/** アイコンから開くとき、窓が出るまで待たせる時間。起動中らしく見せる */
const openingMs = 400;

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
	// 添字が下辺に並べる位置、値がそこに置く窓の key。1 枚を戻したときに
	// 残りが左へ動かないよう、空いた位置は null のまま残す
	const [minimizedSlots, setMinimizedSlots] = useState<(number | null)[]>([]);
	// アイコンから開くのを待っている窓の数。0 でない間はカーソルを砂時計にする
	const [openingCount, setOpeningCount] = useState(0);
	const nextKey = useRef(1);
	const nextCascade = useRef(1);
	const lastIconClick = useRef<{ iconId: string; at: number } | null>(null);

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

	const openFromIcon = (iconId: string) => {
		setOpeningCount((current) => {
			return current + 1;
		});
		window.setTimeout(() => {
			open(iconId);
			setOpeningCount((current) => {
				return current - 1;
			});
		}, openingMs);
	};

	/**
	 * ダブルクリックを自前で数える。ブラウザの dblclick は click 回数が
	 * ちょうど 2 のときしか出ず、連打すると 2 回目以降が出ないため。
	 */
	const handleIconClick = (iconId: string) => {
		const at = Date.now();
		const previous = lastIconClick.current;
		const isSecondClick =
			previous !== null &&
			previous.iconId === iconId &&
			at - previous.at <= doubleClickMs;
		// 3 回目を 2 回目の続きにしないよう、開いたら数え直す
		lastIconClick.current = isSecondClick ? null : { iconId, at };
		if (isSecondClick) {
			openFromIcon(iconId);
		}
	};

	const takeMinimizedSlot = (key: number) => {
		return setMinimizedSlots((current) => {
			if (current.includes(key)) {
				return current;
			}
			const free = current.indexOf(null);
			if (free === -1) {
				return [...current, key];
			}
			return current.map((candidate, index) => {
				return index === free ? key : candidate;
			});
		});
	};

	const releaseMinimizedSlot = (key: number) => {
		return setMinimizedSlots((current) => {
			if (!current.includes(key)) {
				return current;
			}
			return current.map((candidate) => {
				return candidate === key ? null : candidate;
			});
		});
	};

	const forget = (key: number) => {
		setWindows((current) => {
			return current.filter((candidate) => {
				return candidate.key !== key;
			});
		});
		releaseMinimizedSlot(key);
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
							className={`flex ${openingCount > 0 ? "cursor-hourglass" : "cursor-default"} select-none flex-col items-center gap-1 border border-transparent p-1 text-white focus-visible:border-white focus-visible:border-dotted`}
							onClick={() => {
								return handleIconClick(icon.id);
							}}
							onKeyDown={(event) => {
								if (event.key === "Enter" || event.key === " ") {
									event.preventDefault();
									openFromIcon(icon.id);
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
							minimizedSlot: minimizedSlots.indexOf(entry.key),
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
								return minimized
									? takeMinimizedSlot(entry.key)
									: releaseMinimizedSlot(entry.key);
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
