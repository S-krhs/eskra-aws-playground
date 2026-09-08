// In scope: the HTTP routes for the media listing and for serving thumbnails
// Out of scope: building DB queries, R2 wire detail
import { mediaObjectRepository } from "@eskra-aws-playground/repositories/media/media-object/repository.js";
import { mediaStorageRepository } from "@eskra-aws-playground/repositories/media/media-storage/repository.js";
import { Hono } from "hono";
import { z } from "zod";
import { toInvalidQueryMessage } from "./intermediate-models/invalid-query.js";
import { toMediaView } from "./intermediate-models/media-view.js";

// How much the virtual scroll appends at a time: larger makes the first paint heavier, smaller makes the appending visible
const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

// A thumbnail gets a new id whenever its content changes, so the browser may keep it
const THUMBNAIL_CACHE_CONTROL = "private, max-age=86400";

const listQuerySchema = z
	.object({
		logicalPath: z.string().min(1).optional(),
		contentTypePrefix: z.string().min(1).optional(),
		limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
		cursorUploadedAt: z.iso.datetime().optional(),
		cursorId: z.uuid().optional(),
	})
	.refine(
		(query) => {
			return (
				(query.cursorUploadedAt === undefined) ===
				(query.cursorId === undefined)
			);
		},
		{ message: "cursorUploadedAt と cursorId は両方を渡してください" },
	);

const mediaIdSchema = z.uuid();

export const mediaRoutes = new Hono()
	.get("/", async (c) => {
		const query = listQuerySchema.safeParse(c.req.query());

		if (!query.success) {
			return c.json({ message: toInvalidQueryMessage(query.error) }, 400);
		}

		const page = await mediaObjectRepository.findPage({
			logicalPath: query.data.logicalPath,
			contentTypePrefix: query.data.contentTypePrefix,
			limit: query.data.limit,
			cursor:
				query.data.cursorUploadedAt && query.data.cursorId
					? {
							uploadedAt: new Date(query.data.cursorUploadedAt),
							id: query.data.cursorId,
						}
					: undefined,
		});

		return c.json({
			objects: page.objects.map(toMediaView),
			nextCursor: page.nextCursor
				? {
						uploadedAt: page.nextCursor.uploadedAt.toISOString(),
						id: page.nextCursor.id,
					}
				: null,
		});
	})
	.get("/:id/thumbnail", async (c) => {
		// Checked as a UUID first, since it becomes a file name verbatim
		const id = mediaIdSchema.safeParse(c.req.param("id"));

		if (!id.success) {
			return c.json({ message: "id が UUID ではありません" }, 400);
		}

		const media = await mediaObjectRepository.findById(id.data);

		if (!media?.thumbnailKey) {
			// Absent until the sync finishes generating it; the screen falls back to a placeholder
			return c.json({ message: "サムネイルがまだありません" }, 404);
		}

		const object = await mediaStorageRepository.get({
			key: media.thumbnailKey,
		});
		const body = new Uint8Array(await new Response(object.body).arrayBuffer());

		return c.body(body, 200, {
			"content-type": object.contentType,
			"cache-control": THUMBNAIL_CACHE_CONTROL,
		});
	});
