// In scope: 押しボタンの見た目をした、別タブで開くリンク
// Out of scope: リンク先の組み立て

import type { ReactNode } from "react";

interface Props {
	href: string;
	children: ReactNode;
}

/** 押しボタンと同じ見た目のリンク。常に別タブで開く */
export const LinkButton = ({ href, children }: Props) => {
	return (
		<a
			className="bevel-raised active:bevel-sunken inline-block min-w-22 cursor-pointer bg-face px-3 py-[5px] text-center text-black no-underline focus-visible:outline-dotted focus-visible:outline-1 focus-visible:outline-black focus-visible:-outline-offset-4 active:pt-1.5 active:pr-[11px] active:pb-1 active:pl-[13px]"
			href={href}
			target="_blank"
			rel="noopener noreferrer"
		>
			{children}
		</a>
	);
};
