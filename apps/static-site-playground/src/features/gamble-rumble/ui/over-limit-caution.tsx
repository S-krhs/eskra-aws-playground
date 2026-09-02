// In scope: 遊びすぎを伝える注意文の見た目
// Out of scope: 出すかどうかの判断、収支の状態管理

// 背景画像ではなく img の src に置く。data URI を背景の arbitrary value にすると
// Tailwind の生成 CSS が PostCSS の Unclosed string で落ち、dev サーバーが動かない。
// Tailwind は生のテキストを走査するため、この注記にその class 名を書いてもいけない。
const iconSrc =
	"data:image/svg+xml,%3csvg%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cg%20clip-path='url(%23clip0_320_107)'%3e%3cpath%20d='M12%2022C17.5%2022%2022%2017.5%2022%2012C22%206.5%2017.5%202%2012%202C6.5%202%202%206.5%202%2012C2%2017.5%206.5%2022%2012%2022ZM11.3%206.5H12.8V14H11.3V6.5ZM12%2015.5C12.6%2015.5%2013%2015.9%2013%2016.5C13%2017.1%2012.6%2017.5%2012%2017.5C11.4%2017.5%2011%2017.1%2011%2016.5C11%2015.9%2011.4%2015.5%2012%2015.5Z'%20fill='%23CC0000'/%3e%3c/g%3e%3cdefs%3e%3cclipPath%20id='clip0_320_107'%3e%3crect%20width='24'%20height='24'%20fill='white'/%3e%3c/clipPath%3e%3c/defs%3e%3c/svg%3e";

/** 遊びすぎを伝える注意文。出すかどうかは呼び出し側が決める */
export const OverLimitCaution = () => {
	return (
		<div className="bevel-sunken mb-3 flex items-center gap-2 bg-[#ffe0e0] px-3 py-2 text-[#cc0000]">
			<img
				className="size-6 flex-none"
				src={iconSrc}
				alt=""
				aria-hidden="true"
			/>
			<p>あなたの遊技は、もう“適度”を超えてしまっているかもしれません。</p>
		</div>
	);
};
