// In scope: a link that looks like a push button and opens in a new tab
// Out of scope: building the destination URL

import type { ReactNode } from "react";

interface Props {
	href: string;
	children: ReactNode;
}

/** A link styled as a push button; always opens in a new tab */
export const LinkButton = ({ href, children }: Props) => {
	return (
		<a
			className="bevel-raised active:bevel-sunken bg-face inline-block min-w-22 cursor-pointer px-3 py-[5px] text-center text-black no-underline focus-visible:outline-1 focus-visible:-outline-offset-4 focus-visible:outline-black focus-visible:outline-dotted active:pt-1.5 active:pr-[11px] active:pb-1 active:pl-[13px]"
			href={href}
			target="_blank"
			rel="noopener noreferrer"
		>
			{children}
		</a>
	);
};
