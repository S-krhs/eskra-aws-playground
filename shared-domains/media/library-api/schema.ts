// In scope: the request and response schemas of the media library's HTTP API
// Out of scope: routing, DB access, generating the client, how the screen uses them
// The route definitions built from these need zod carrying OpenAPI metadata, so z comes from there
import { z } from "@hono/zod-openapi";

// What the virtual scroll appends at a time: larger makes the first paint heavier, smaller makes the appending visible
const MEDIA_PAGE_DEFAULT_LIMIT = 200;
const MEDIA_PAGE_MAX_LIMIT = 500;

/** A position in the listing — the last item of the previous page. Both fields travel together or not at all. */
export const mediaCursorSchema = z
	.object({
		uploadedAt: z.iso.datetime(),
		id: z.uuid(),
	})
	.openapi("MediaCursor");

/** The cursor's two fields have to travel together; that pairing is checked in the route, since OpenAPI can't state it. */
export const mediaListQuerySchema = z.object({
	/** Which side of the trash to read. The two never mix, so one listing answers for both. */
	state: z.enum(["active", "trashed"]).default("active"),
	logicalPath: z.string().min(1).optional(),
	contentTypePrefix: z.string().min(1).optional(),
	limit: z.coerce
		.number()
		.int()
		.min(1)
		.max(MEDIA_PAGE_MAX_LIMIT)
		.default(MEDIA_PAGE_DEFAULT_LIMIT),
	cursorUploadedAt: z.iso.datetime().optional(),
	cursorId: z.uuid().optional(),
});

export const mediaIdParamSchema = z.object({
	id: z.uuid(),
});

/** The original is shown inline unless this asks for it as a file. */
export const mediaFileQuerySchema = z.object({
	// A boolean would read "false" as true, so the one value that means anything is spelled out
	download: z.literal("1").optional(),
});

/** One media object as the screen sees it. The R2 key never leaves the server, so only the thumbnail's presence is reported. */
export const mediaSchema = z
	.object({
		id: z.uuid(),
		fileName: z.string(),
		logicalPath: z.string(),
		contentType: z.string(),
		byteSize: z.number(),
		width: z.number().optional(),
		height: z.number().optional(),
		durationMs: z.number().optional(),
		hasThumbnail: z.boolean(),
		uploadedAt: z.iso.datetime(),
	})
	.openapi("Media");

export const mediaListResponseSchema = z
	.object({
		objects: z.array(mediaSchema),
		// A union rather than `.nullable()`: calling that on a registered schema writes the null into
		// the shared component itself, so every other reference to it would allow null too
		nextCursor: z.union([mediaCursorSchema, z.null()]),
	})
	.openapi("MediaListResponse");

/** One sync run. A null finishedAt means it is still going. */
export const syncRunSchema = z
	.object({
		id: z.uuid(),
		startedAt: z.iso.datetime(),
		finishedAt: z.iso.datetime().nullable(),
		scannedCount: z.number(),
		insertedCount: z.number(),
		updatedCount: z.number(),
		deletedCount: z.number(),
		error: z.string().nullable(),
	})
	.openapi("SyncRun");

export const syncStatusResponseSchema = z
	.object({
		latest: z.union([syncRunSchema, z.null()]),
		running: z.union([syncRunSchema, z.null()]),
	})
	.openapi("SyncStatusResponse");

export type MediaCursor = z.infer<typeof mediaCursorSchema>;
export type MediaListQuery = z.infer<typeof mediaListQuerySchema>;
export type Media = z.infer<typeof mediaSchema>;
export type MediaListResponse = z.infer<typeof mediaListResponseSchema>;
export type SyncRun = z.infer<typeof syncRunSchema>;
export type SyncStatusResponse = z.infer<typeof syncStatusResponseSchema>;
