// In scope: 窓を並べる側から個々の窓へ渡す、重なり順と開閉の口
// Out of scope: 窓の描画、デスクトップの実装

import { createContext } from "react";

/** 窓を並べる側が 1 枚ごとに渡す情報。単独で使う窓では null になる */
export interface WindowHost {
	/** 手前から数えた重なり順。大きいほど手前 */
	zIndex: number;
	/** 何枚目に開いたか。ずらして重ねるために使う */
	cascadeIndex: number;
	onClose: () => void;
	onFocus: () => void;
}

export const WindowHostContext = createContext<WindowHost | null>(null);
