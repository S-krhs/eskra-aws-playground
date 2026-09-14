// In scope: turning a MediaObject filter into the condition a query narrows its rows with
// Out of scope: paging, ordering, reading the rows

import type { Prisma } from "../../../generated/prisma/client.js";
import type { MediaObjectFilter } from "../../media-object/types.js";

/** Shared by the listing and the tag count, so a count always describes what the listing would show. */
export const toMediaObjectWhere = (
	filter: MediaObjectFilter,
): Prisma.MediaObjectWhereInput => {
	return {
		trashedAt:
			filter.state === undefined
				? undefined
				: filter.state === "trashed"
					? { not: null }
					: null,
		// The inbox and the library are the same side of the trash, split on the logical path: an object
		// nothing has filed carries the empty one. The trash keeps the path each object was filed under,
		// so it answers for both kinds on whatever path it is given
		logicalPath: filter.state === "inbox" ? "" : filter.logicalPath,
		NOT: filter.state === "filed" ? { logicalPath: "" } : undefined,
		contentType: filter.contentTypePrefix
			? { startsWith: filter.contentTypePrefix }
			: undefined,
		// One `some` per name: a single `some` with `in` would keep an object carrying any of them
		AND: filter.tagNames?.map((name) => {
			return { tags: { some: { tag: { name } } } };
		}),
	};
};
