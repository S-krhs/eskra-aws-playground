// In scope: turning each media operation's result into a response
// Out of scope: registering the routes, reading the DB or storage, the shape of what comes back
import type { RouteHandler } from "@hono/zod-openapi";
import { getMediaFileOperation } from "./operations/get-media-file-operation.js";
import { getThumbnailOperation } from "./operations/get-thumbnail-operation.js";
import { listMediaOperation } from "./operations/list-media-operation.js";
import type {
	getMediaFileRoute,
	getThumbnailRoute,
	listMediaRoute,
} from "./schema.js";

// A rebuilt thumbnail, and an original replaced under the same key, both keep their URL, so the ETag is
// the only thing that tells the browser the content changed. Revalidating on every read costs one 304
// and can't serve a stale one.
const CACHE_CONTROL = "private, max-age=0, must-revalidate";

/** Weak, because the value identifies the source object's content rather than the thumbnail's bytes. */
const toWeakEtag = (etag: string): string => {
	return `W/"${etag}"`;
};

/** Strong, because for the original the value identifies the very bytes being sent. */
const toStrongEtag = (etag: string): string => {
	return `"${etag}"`;
};

/**
 * A file name that isn't ASCII can't travel in the header as it stands, so it goes in RFC 5987's
 * `filename*`. Without `filename` beside it a browser falls back to the last path segment, which is
 * the id — acceptable, and the alternative is transliterating a Japanese name into something wrong.
 */
const buildContentDisposition = (
	fileName: string,
	isDownload: boolean,
): string => {
	return `${isDownload ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(fileName)}`;
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
			"cache-control": CACHE_CONTROL,
		});
	}

	return c.body(result.data.body, 200, {
		"content-type": result.data.contentType,
		"cache-control": CACHE_CONTROL,
		etag: toWeakEtag(result.data.etag),
	});
};

export const getMediaFile: RouteHandler<typeof getMediaFileRoute> = async (
	c,
) => {
	const result = await getMediaFileOperation({
		mediaId: c.req.valid("param").id,
		range: c.req.header("range"),
		knownEtags: parseIfNoneMatch(c.req.header("if-none-match")),
	});

	if (result.kind === "NOT_FOUND") {
		return c.json({ message: "そのメディアはありません" }, 404);
	}

	if (result.kind === "NOT_MODIFIED") {
		return c.body(null, 304, {
			etag: toStrongEtag(result.etag),
			"cache-control": CACHE_CONTROL,
		});
	}

	const file = result.data;

	return c.body(file.body, file.isPartial ? 206 : 200, {
		"content-type": file.contentType,
		"content-length": String(file.byteSize),
		etag: toStrongEtag(file.etag),
		// A browser only sends Range once the server has said it takes one, so a <video> can't seek
		// without this
		"accept-ranges": "bytes",
		"content-disposition": buildContentDisposition(
			file.fileName,
			c.req.valid("query").download === "1",
		),
		"cache-control": CACHE_CONTROL,
		...(file.contentRange ? { "content-range": file.contentRange } : {}),
	});
};
