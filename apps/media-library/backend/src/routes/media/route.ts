// In scope: turning each media operation's result into a response
// Out of scope: registering the routes, reading the DB or storage, the shape of what comes back
import type { RouteHandler } from "@hono/zod-openapi";
import { getThumbnailOperation } from "./operations/get-thumbnail-operation.js";
import { listMediaOperation } from "./operations/list-media-operation.js";
import type { getThumbnailRoute, listMediaRoute } from "./schema.js";

// A rebuilt thumbnail keeps its id and therefore its URL, so the ETag is the only thing that tells the
// browser the picture changed. Revalidating on every read costs one 304 and can't serve a stale one.
const THUMBNAIL_CACHE_CONTROL = "private, max-age=0, must-revalidate";

/** Weak, because the value identifies the source object's content rather than the thumbnail's bytes. */
const toWeakEtag = (etag: string): string => {
	return `W/"${etag}"`;
};

/** If-None-Match carries a comma-separated list, and each entry may be quoted and marked weak. */
const parseIfNoneMatch = (header: string | undefined): string[] => {
	if (!header) {
		return [];
	}

	return header.split(",").map((entry) => {
		return entry.trim().replace(/^W\//, "").replace(/^"|"$/g, "");
	});
};

export const listMedia: RouteHandler<typeof listMediaRoute> = async (c) => {
	const query = c.req.valid("query");

	// The cursor's two fields only make sense together, and no field-level schema can say so
	if (
		(query.cursorUploadedAt === undefined) !==
		(query.cursorId === undefined)
	) {
		return c.json(
			{ message: "cursorUploadedAt と cursorId は両方を渡してください" },
			400,
		);
	}

	const result = await listMediaOperation({
		logicalPath: query.logicalPath,
		contentTypePrefix: query.contentTypePrefix,
		limit: query.limit,
		cursor:
			query.cursorUploadedAt && query.cursorId
				? { uploadedAt: new Date(query.cursorUploadedAt), id: query.cursorId }
				: undefined,
	});

	return c.json(result.data, 200);
};

export const getThumbnail: RouteHandler<typeof getThumbnailRoute> = async (
	c,
) => {
	const result = await getThumbnailOperation({
		mediaId: c.req.valid("param").id,
		knownEtags: parseIfNoneMatch(c.req.header("if-none-match")),
	});

	if (result.kind === "NOT_GENERATED") {
		// Absent until the sync finishes generating it; the screen falls back to a placeholder
		return c.json({ message: "サムネイルがまだありません" }, 404);
	}

	if (result.kind === "NOT_MODIFIED") {
		return c.body(null, 304, {
			etag: toWeakEtag(result.etag),
			"cache-control": THUMBNAIL_CACHE_CONTROL,
		});
	}

	return c.body(result.data.body, 200, {
		"content-type": result.data.contentType,
		"cache-control": THUMBNAIL_CACHE_CONTROL,
		etag: toWeakEtag(result.data.etag),
	});
};
