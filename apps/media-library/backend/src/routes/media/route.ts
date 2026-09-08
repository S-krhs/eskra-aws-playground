// In scope: dispatching the media routes and turning each operation's result into a response
// Out of scope: reading the DB or storage, the shape of what comes back, generating a thumbnail

import { mediaIdParamSchema } from "@eskra-aws-playground/shared-domains/contracts/media-library-api.js";
import { OpenAPIHono } from "@hono/zod-openapi";
import { toInvalidRequestResponse } from "../_shared/responses/error-response.js";
import { getThumbnailOperation } from "./operations/get-thumbnail-operation.js";
import { listMediaOperation } from "./operations/list-media-operation.js";
import { listMediaRoute } from "./schema.js";

// A thumbnail gets a new id whenever its content changes, so the browser may keep it
const THUMBNAIL_CACHE_CONTROL = "private, max-age=86400";

export const mediaRoute = new OpenAPIHono({
	// Without this, a request that fails the route's own schema comes back in zod's shape rather than ours
	defaultHook: (result, c) => {
		if (!result.success) {
			return c.json(toInvalidRequestResponse(result.error), 400);
		}
	},
})
	.openapi(listMediaRoute, async (c) => {
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

		return c.json(await listMediaOperation(query), 200);
	})
	// The thumbnail serves an image rather than JSON, so it stays out of the OpenAPI document —
	// the screen reaches it through an <img> src, not a generated client
	.get("/:id/thumbnail", async (c) => {
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
