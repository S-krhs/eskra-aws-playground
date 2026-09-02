// In scope: 負けが境界を超えたときだけ出す注意文
// Out of scope: 収支の状態管理、収支の値表示

import { cautionYen } from "@/entities/balance/model/balance-thresholds.js";
import "./over-limit-caution.css";

interface Props {
	balanceYen: number;
}

/** 収支が `cautionYen` 以下のときだけ注意文を出す。それ以外は何も描画しない */
export const OverLimitCaution = ({ balanceYen }: Props) => {
	if (balanceYen > cautionYen) {
		return null;
	}

	return (
		<div className="over-limit-caution">
			<p>あなたの遊技は、もう“適度”を超えてしまっているかもしれません。</p>
		</div>
	);
};
