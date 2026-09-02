// In scope: 収支をツイートするリンク
// Out of scope: ツイート文面の組み立て、収支の状態管理

import type { CurrencyUnit } from "@/entities/currency-unit/model/currency-unit.js";
import { shareUrl } from "@/features/share-balance/lib/share-url.js";

interface Props {
	balanceYen: number;
	unit: CurrencyUnit;
}

/** 現在の収支のツイート画面を別タブで開くリンク。見た目はボタンに揃える */
export const ShareLink = ({ balanceYen, unit }: Props) => {
	return (
		<a
			className="winforms-button"
			href={shareUrl(balanceYen, unit)}
			target="_blank"
			rel="noopener noreferrer"
		>
			醜態を晒す
		</a>
	);
};
