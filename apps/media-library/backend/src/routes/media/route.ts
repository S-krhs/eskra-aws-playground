// In scope: turning each media operation's result into a response
// Out of scope: registering the routes, reading the DB or storage, the shape of what comes back
import type { RouteHandler } from "@hono/zod-openapi";
import {
	parseIfNoneMatch,
	REVALIDATE_CACHE_CONTROL,
	toStrongEtag,
	toWeakEtag,
} from "../_shared/responses/etag.js";
import { copyMediaToClipboardOperation } from "./operations/copy-media-to-clipboard-operation.js";
import { getMediaFileOperation } from "./operations/get-media-file-operation.js";
import { getThumbnailOperation } from "./operations/get-thumbnail-operation.js";
import { listMediaOperation } from "./operations/list-media-operation.js";
import { moveMediaOperation } from "./operations/move-media-operation.js";
import { replaceMediaTagsOperation } from "./operations/replace-media-tags-operation.js";
import { setMediaTrashedOperation } from "./operations/set-media-trashed-operation.js";
import type {
	copyMediaToClipboardRoute,
	getMediaFileRoute,
	getThumbnailRoute,
	listMediaRoute,
	moveMediaRoute,
	replaceMediaTagsRoute,
	restoreMediaRoute,
	trashMediaRoute,
} from "./schema.js";

// The same answer whether the media was never registered or is gone; nothing the caller does differs
const MEDIA_NOT_FOUND_MESSAGE = "そのメディアはありません";

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
		trashed: query.state === "trashed",
		logicalPath: query.logicalPath,
		contentTypePrefix: query.contentTypePrefix,
		tagName: query.tag,
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
			"cache-control": REVALIDATE_CACHE_CONTROL,
		});
	}

	return c.body(result.data.body, 200, {
		"content-type": result.data.contentType,
		"cache-control": REVALIDATE_CACHE_CONTROL,
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
		return c.json({ message: MEDIA_NOT_FOUND_MESSAGE }, 404);
	}

	if (result.kind === "NOT_MODIFIED") {
		return c.body(null, 304, {
			etag: toStrongEtag(result.etag),
			"cache-control": REVALIDATE_CACHE_CONTROL,
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
		"cache-control": REVALIDATE_CACHE_CONTROL,
		...(file.contentRange ? { "content-range": file.contentRange } : {}),
	});
};

export const trashMedia: RouteHandler<typeof trashMediaRoute> = async (c) => {
	const result = await setMediaTrashedOperation({
		mediaId: c.req.valid("param").id,
		trashed: true,
	});

	if (result.kind === "NOT_FOUND") {
		return c.json({ message: MEDIA_NOT_FOUND_MESSAGE }, 404);
	}

	return c.body(null, 204);
};

export const restoreMedia: RouteHandler<typeof restoreMediaRoute> = async (
	c,
) => {
	const result = await setMediaTrashedOperation({
		mediaId: c.req.valid("param").id,
		trashed: false,
	});

	if (result.kind === "NOT_FOUND") {
		return c.json({ message: MEDIA_NOT_FOUND_MESSAGE }, 404);
	}

	return c.body(null, 204);
};

export const copyMediaToClipboard: RouteHandler<
	typeof copyMediaToClipboardRoute
> = async (c) => {
	const result = await copyMediaToClipboardOperation({
		mediaId: c.req.valid("param").id,
	});

	if (result.kind === "NOT_FOUND") {
		return c.json({ message: MEDIA_NOT_FOUND_MESSAGE }, 404);
	}

	return c.body(null, 204);
};

export const replaceMediaTags: RouteHandler<
	typeof replaceMediaTagsRoute
> = async (c) => {
	const result = await replaceMediaTagsOperation({
		mediaId: c.req.valid("param").id,
		tagNames: c.req.valid("json").tags,
	});

	if (result.kind === "NOT_FOUND") {
		return c.json({ message: MEDIA_NOT_FOUND_MESSAGE }, 404);
	}

	return c.json(result.data, 200);
};

export const moveMedia: RouteHandler<typeof moveMediaRoute> = async (c) => {
	const result = await moveMediaOperation({
		mediaId: c.req.valid("param").id,
		logicalPath: c.req.valid("json").logicalPath,
	});

	if (result.kind === "NOT_FOUND") {
		return c.json({ message: MEDIA_NOT_FOUND_MESSAGE }, 404);
	}

	return c.json(result.data, 200);
};
