// In scope: 収支をツイートするリンク
// Out of scope: ツイート文面の組み立て、収支の状態管理

import type { CurrencyUnit } from "@/entities/currency-unit/model/currency-unit.js";
import { shareUrl } from "@/features/share-balance/lib/share-url.js";
import { LinkButton } from "@/shared/ui/win-forms/link-button.js";

interface Props {
	balanceYen: number;
	unit: CurrencyUnit;
}

/** 現在の収支のツイート画面を別タブで開くリンク */
export const ShareLink = ({ balanceYen, unit }: Props) => {
	return <LinkButton href={shareUrl(balanceYen, unit)}>醜態を晒す</LinkButton>;
};
