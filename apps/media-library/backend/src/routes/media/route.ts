// In scope: dispatching the media routes, validating the request and shaping the response
// Out of scope: reading the DB or storage, the shape of what comes back, generating a thumbnail
import { Hono } from "hono";
import { toInvalidRequestResponse } from "../_shared/responses/error-response.js";
import { getThumbnailOperation } from "./operations/get-thumbnail-operation.js";
import { listMediaOperation } from "./operations/list-media-operation.js";
import { mediaIdParamSchema, mediaListQuerySchema } from "./schema.js";

// A thumbnail gets a new id whenever its content changes, so the browser may keep it
const THUMBNAIL_CACHE_CONTROL = "private, max-age=86400";

export const mediaRoute = new Hono()
	.get("/", async (c) => {
		const query = mediaListQuerySchema.safeParse(c.req.query());

		if (!query.success) {
			return c.json(toInvalidRequestResponse(query.error), 400);
		}

		// The cursor's two fields only make sense together, and no field-level schema can say so
		if (
			(query.data.cursorUploadedAt === undefined) !==
			(query.data.cursorId === undefined)
		) {
			return c.json(
				{ message: "cursorUploadedAt と cursorId は両方を渡してください" },
				400,
			);
		}

		return c.json(await listMediaOperation(query.data), 200);
	})
	.get("/:id/thumbnail", async (c) => {
		// Checked as a UUID first, since it reaches storage as part of a key
		const params = mediaIdParamSchema.safeParse(c.req.param());

		if (!params.success) {
			return c.json(toInvalidRequestResponse(params.error), 400);
		}

		const thumbnail = await getThumbnailOperation(params.data.id);

		if (!thumbnail) {
			// Absent until the sync finishes generating it; the screen falls back to a placeholder
			return c.json({ message: "サムネイルがまだありません" }, 404);
		}

		return c.body(thumbnail.body, 200, {
			"content-type": thumbnail.contentType,
			"cache-control": THUMBNAIL_CACHE_CONTROL,
		});
	});
