// In scope: the ids lying between two others in a given order
// Out of scope: holding the selection, where the order comes from

/** Both ends included, in `order`'s order whichever way round they are given. Undefined when either end isn't in it. */
export const pickRange = (
	order: string[],
	fromId: string,
	toId: string,
): string[] | undefined => {
	const from = order.indexOf(fromId);
	const to = order.indexOf(toId);

	if (from === -1 || to === -1) {
		return undefined;
	}

	return order.slice(Math.min(from, to), Math.max(from, to) + 1);
};
