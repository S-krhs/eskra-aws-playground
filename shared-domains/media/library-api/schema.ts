// In scope: the request and response schemas of the media library's HTTP API
// Out of scope: routing, DB access, generating the client, how the screen uses them
// The route definitions built from these need zod carrying OpenAPI metadata, so z comes from there
import { z } from "@hono/zod-openapi";

// What the virtual scroll appends at a time: larger makes the first paint heavier, smaller makes the appending visible
const MEDIA_PAGE_DEFAULT_LIMIT = 200;
const MEDIA_PAGE_MAX_LIMIT = 500;

// The column the names are stored in, and a count past which a picker stops being usable anyway
const MEDIA_TAG_MAX_LENGTH = 64;
const MEDIA_TAG_MAX_COUNT = 50;

// The column a folder's path is stored in
const MEDIA_FOLDER_PATH_MAX_LENGTH = 512;

/** A position in the listing — the last item of the previous page. Both fields travel together or not at all. */
export const mediaCursorSchema = z
	.object({
		uploadedAt: z.iso.datetime(),
		id: z.uuid(),
	})
	.openapi("MediaCursor");

/**
 * Which of the four sides to read. `inbox` is what has been taken in but not filed into a folder yet,
 * `filed` is the library proper, `archived` is what was filed into the archive instead, and `trashed` is
 * every one of them once it is in the trash.
 * They never mix, so one listing answers for all four.
 */
const mediaStateSchema = z.enum(["inbox", "filed", "archived", "trashed"]);

/**
 * Narrows to the media carrying every tag named, one per repeated key.
 * The validator hands a key given once over as a plain string, so it is wrapped before being read.
 */
const tagNamesQuerySchema = z.preprocess(
	(value) => {
		return typeof value === "string" ? [value] : value;
	},
	z.array(z.string().min(1).max(MEDIA_TAG_MAX_LENGTH)).max(MEDIA_TAG_MAX_COUNT),
);

/** The cursor's two fields have to travel together; that pairing is checked in the route, since OpenAPI can't state it. */
export const mediaListQuerySchema = z.object({
	state: mediaStateSchema.default("filed"),
	/** Narrows to one folder. The inbox is the media no folder holds, so it takes none. */
	logicalPath: z.string().min(1).optional(),
	contentTypePrefix: z.string().min(1).optional(),
	tag: tagNamesQuerySchema.optional(),
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
		// Stays true in the trash, where it says a restore takes the media back into the archive
		isArchived: z.boolean(),
		contentType: z.string(),
		byteSize: z.number(),
		width: z.number().optional(),
		height: z.number().optional(),
		durationMs: z.number().optional(),
		hasThumbnail: z.boolean(),
		tags: z.array(z.string()),
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

/**
 * A folder's path: slash-separated names, no empty, relative or leading-underscore segment.
 * The underscore is what the storage package prefixes its own areas with, so a folder taking one
 * would put media where the sync reads its staging ground.
 */
export const mediaFolderPathSchema = z
	.string()
	.min(1)
	.max(MEDIA_FOLDER_PATH_MAX_LENGTH)
	.refine((path) => {
		return path.split("/").every((segment) => {
			return (
				segment !== "" &&
				segment !== "." &&
				segment !== ".." &&
				!segment.startsWith("_")
			);
		});
	});

/**
 * Where to file one media object. The empty path takes it back out of every folder — but not into the
 * archive, which holds folders only; that pairing is checked in the route, since OpenAPI can't state it.
 */
export const mediaMoveRequestSchema = z
	.object({
		logicalPath: z.union([z.literal(""), mediaFolderPathSchema]),
		isArchived: z.boolean(),
	})
	.openapi("MediaMoveRequest");

export const mediaLocationResponseSchema = z
	.object({
		logicalPath: z.string(),
		isArchived: z.boolean(),
	})
	.openapi("MediaLocationResponse");

export const folderListQuerySchema = z.object({
	// The same spelled-out value as `download`, since a boolean would read "false" as true
	archived: z.literal("1").optional(),
});

/** The folders there are to file into, whether or not anything is filed there yet. */
export const folderListResponseSchema = z
	.object({
		folders: z.array(z.string()),
	})
	.openapi("FolderListResponse");

/** The tags to leave on one media object. Whatever isn't listed comes off it. */
export const mediaTagsRequestSchema = z
	.object({
		tags: z
			.array(z.string().min(1).max(MEDIA_TAG_MAX_LENGTH))
			.max(MEDIA_TAG_MAX_COUNT),
	})
	.openapi("MediaTagsRequest");

/** Tag names, by name. Only the name is ever needed outside the DB, so the id stays there. */
export const tagListResponseSchema = z
	.object({
		tags: z.array(z.string()),
	})
	.openapi("TagListResponse");

/**
 * The narrowing the listing takes, for counting the tags on what it would list. Unlike the listing,
 * `state` has no default: leaving it out counts every side at once, trashed media and the inbox included.
 */
export const tagUsageListQuerySchema = z.object({
	state: mediaStateSchema.optional(),
	logicalPath: z.string().min(1).optional(),
	contentTypePrefix: z.string().min(1).optional(),
	tag: tagNamesQuerySchema.optional(),
});

/** The count covers only the media the query narrowed to. */
export const tagUsageSchema = z
	.object({
		name: z.string(),
		mediaCount: z.number(),
	})
	.openapi("TagUsage");

/** The tags carried by at least one of the media counted, the one carried by the most first. */
export const tagUsageListResponseSchema = z
	.object({
		tags: z.array(tagUsageSchema),
	})
	.openapi("TagUsageListResponse");

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
export type TagListResponse = z.infer<typeof tagListResponseSchema>;
export type TagUsageListResponse = z.infer<typeof tagUsageListResponseSchema>;
export type FolderListResponse = z.infer<typeof folderListResponseSchema>;
export type MediaLocationResponse = z.infer<typeof mediaLocationResponseSchema>;
export type SyncRun = z.infer<typeof syncRunSchema>;
export type SyncStatusResponse = z.infer<typeof syncStatusResponseSchema>;
