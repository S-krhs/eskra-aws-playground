// In scope: turning each media operation's result into a response
// Out of scope: registering the routes, reading the DB or storage, the shape of what comes back
import type { RouteHandler } from "@hono/zod-openapi";
import { getThumbnailOperation } from "./operations/get-thumbnail-operation.js";
import { listMediaOperation } from "./operations/list-media-operation.js";
import type { getThumbnailRoute, listMediaRoute } from "./schema.js";

// A thumbnail gets a new id whenever its content changes, so the browser may keep it
const THUMBNAIL_CACHE_CONTROL = "private, max-age=86400";

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
	const result = await getThumbnailOperation(c.req.valid("param").id);

	if (result.kind === "NOT_GENERATED") {
		// Absent until the sync finishes generating it; the screen falls back to a placeholder
		return c.json({ message: "サムネイルがまだありません" }, 404);
	}

	return c.body(result.data.body, 200, {
		"content-type": result.data.contentType,
		"cache-control": THUMBNAIL_CACHE_CONTROL,
	});
};
