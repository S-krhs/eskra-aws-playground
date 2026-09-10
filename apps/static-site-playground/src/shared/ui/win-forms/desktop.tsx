// In scope: the desktop laying out icons and opening another window on a double click
// Out of scope: a window's contents, drawing the window frame itself

import { type ReactNode, useRef, useState } from "react";
import { WindowHostContext } from "./window-host.js";

/** An icon on the desktop; `render` draws one opened window */
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

/** Two presses on the same icon within this gap count as a double click */
const doubleClickMs = 500;

/** How long an icon-opened window waits before appearing, so it looks like it is starting up */
const openingMs = 400;

/**
 * Lays icons out at the top left and opens another window on a double click (Enter / Space from the
 * keyboard). It starts with the first icon's window already open.
 */
export const Desktop = ({ icons }: { icons: readonly DesktopIcon[] }) => {
	const firstIcon = icons[0];
	const [windows, setWindows] = useState<OpenWindow[]>(
		firstIcon ? [{ key: 0, iconId: firstIcon.id, cascadeIndex: 0 }] : [],
	);
	// Focus order, frontmost last. Render order stays as opened and never moves:
	// reordering moves DOM nodes, which drops a click mid-press.
	const [zOrder, setZOrder] = useState<number[]>(firstIcon ? [0] : []);
	// Index is the slot along the bottom edge, value the window key in it. A freed slot stays null
	// so restoring one window doesn't shift the rest leftward
	const [minimizedSlots, setMinimizedSlots] = useState<(number | null)[]>([]);
	// How many icon-opened windows are still pending; the cursor is an hourglass while this is non-zero
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
	 * Double clicks are counted here, because the browser's dblclick only fires on exactly 2 clicks
	 * and stops firing once the clicking goes faster than that.
	 */
	const handleIconClick = (iconId: string) => {
		const at = Date.now();
		const previous = lastIconClick.current;
		const isSecondClick =
			previous !== null &&
			previous.iconId === iconId &&
			at - previous.at <= doubleClickMs;
		// Reset after opening, so a third click doesn't continue from the second
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
