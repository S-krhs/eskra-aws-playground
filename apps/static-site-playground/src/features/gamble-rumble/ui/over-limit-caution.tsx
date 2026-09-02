// In scope: 負けが境界を超えたときだけ出す注意文
// Out of scope: 収支の状態管理、収支の値表示

import { cautionYen } from "@/features/gamble-rumble/model/balance-thresholds.js";

const iconUrl =
	"url(\"data:image/svg+xml,%3csvg%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cg%20clip-path='url(%23clip0_320_107)'%3e%3cpath%20d='M12%2022C17.5%2022%2022%2017.5%2022%2012C22%206.5%2017.5%202%2012%202C6.5%202%202%206.5%202%2012C2%2017.5%206.5%2022%2012%2022ZM11.3%206.5H12.8V14H11.3V6.5ZM12%2015.5C12.6%2015.5%2013%2015.9%2013%2016.5C13%2017.1%2012.6%2017.5%2012%2017.5C11.4%2017.5%2011%2017.1%2011%2016.5C11%2015.9%2011.4%2015.5%2012%2015.5Z'%20fill='%23CC0000'/%3e%3c/g%3e%3cdefs%3e%3cclipPath%20id='clip0_320_107'%3e%3crect%20width='24'%20height='24'%20fill='white'/%3e%3c/clipPath%3e%3c/defs%3e%3c/svg%3e\")";

interface Props {
	balanceYen: number;
}

/** 収支が `cautionYen` 以下のときだけ注意文を出す。それ以外は何も描画しない */
export const OverLimitCaution = ({ balanceYen }: Props) => {
	if (balanceYen > cautionYen) {
		return null;
	}

	return (
		<div className="bevel-sunken mb-3 flex items-center gap-2 bg-[#ffe0e0] px-3 py-2 text-[#cc0000]">
			<span
				className="size-6 flex-none bg-contain bg-center bg-no-repeat"
				style={{ backgroundImage: iconUrl }}
				aria-hidden="true"
			/>
			<p>あなたの遊技は、もう“適度”を超えてしまっているかもしれません。</p>
		</div>
	);
};
