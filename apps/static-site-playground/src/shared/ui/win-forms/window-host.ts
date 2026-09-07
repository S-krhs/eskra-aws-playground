// In scope: the stacking and open/close channel the window-arranging side hands each window
// Out of scope: rendering a window, the desktop implementation

import { createContext } from "react";

/** What the arranging side passes per window; null for a window used on its own */
export interface WindowHost {
	/** Stacking order — higher sits in front */
	zIndex: number;
	/** How many windows were opened before this one, used to cascade them */
	cascadeIndex: number;
	/** Slot along the bottom edge while minimized; -1 when not minimized */
	minimizedSlot: number;
	onClose: () => void;
	onFocus: () => void;
	/** Tells the arranging side about a minimize/restore; it decides the bottom-edge slot */
	onMinimizedChange: (minimized: boolean) => void;
}

export const WindowHostContext = createContext<WindowHost | null>(null);
