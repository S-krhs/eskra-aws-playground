// In scope: 窓を並べる側から個々の窓へ渡す、重なり順と開閉の口
// Out of scope: 窓の描画、デスクトップの実装

import { createContext } from "react";

/** 窓を並べる側が 1 枚ごとに渡す情報。単独で使う窓では null になる */
export interface WindowHost {
	/** 手前から数えた重なり順。大きいほど手前 */
	zIndex: number;
	/** 何枚目に開いたか。ずらして重ねるために使う */
	cascadeIndex: number;
	/** 最小化した窓が下辺に並ぶときの位置。最小化していなければ -1 */
	minimizedSlot: number;
	onClose: () => void;
	onFocus: () => void;
	/** 最小化・復元を並べる側へ知らせる。並べる側が下辺の位置を決める */
	onMinimizedChange: (minimized: boolean) => void;
}

export const WindowHostContext = createContext<WindowHost | null>(null);
