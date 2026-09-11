import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app.js";

const objectRepository = vi.hoisted(() => {
	return {
		findPage: vi.fn(),
		findUntrashedById: vi.fn(),
		updateTrashedAt: vi.fn(),
	};
});

vi.mock(
	"@eskra-aws-playground/repositories/media/media-object/repository.js",
	() => {
		return { mediaObjectRepository: objectRepository };
	},
);

const storageRepository = vi.hoisted(() => {
	return { getThumbnail: vi.fn(), get: vi.fn() };
});

vi.mock(
	"@eskra-aws-playground/repositories/media/media-storage/repository.js",
	() => {
		return { mediaStorageRepository: storageRepository };
	},
);

const uiOrigin = "http://127.0.0.1:7420";
const mediaId = "11111111-1111-4111-8111-111111111111";
const cursorId = "22222222-2222-4222-8222-222222222222";
const uploadedAt = new Date("2026-01-02T03:04:05.000Z");

const storedMedia = {
	id: mediaId,
	objectKey: "library/2026/01/02/photo.jpg",
	logicalPath: "2026/01",
	fileName: "photo.jpg",
	contentType: "image/jpeg",
	byteSize: 1024,
	etag: "abc123",
	width: 4000,
	height: 3000,
	durationMs: undefined,
	hasThumbnail: true,
	uploadedAt,
	syncedAt: uploadedAt,
	trashedAt: undefined,
};

beforeEach(() => {
	objectRepository.findPage.mockReset();
	objectRepository.findPage.mockResolvedValue({
		objects: [storedMedia],
		nextCursor: undefined,
	});
	objectRepository.findUntrashedById.mockReset();
	objectRepository.findUntrashedById.mockResolvedValue(storedMedia);
	objectRepository.updateTrashedAt.mockReset();
	objectRepository.updateTrashedAt.mockResolvedValue(1);
	storageRepository.getThumbnail.mockReset();
	storageRepository.getThumbnail.mockResolvedValue({
		body: new Response(new Uint8Array([1, 2, 3])).body,
		contentType: "image/webp",
		byteSize: 3,
		contentRange: undefined,
		isPartial: false,
	});
	storageRepository.get.mockReset();
	storageRepository.get.mockResolvedValue({
		body: new Response(new Uint8Array([4, 5, 6, 7])).body,
		contentType: "image/jpeg",
		byteSize: 4,
		contentRange: undefined,
		isPartial: false,
	});
});

describe("listMedia", () => {
	it("returns the page without the key the object sits under in storage", async () => {
		const response = await createApp().request(`${uiOrigin}/api/media`);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			objects: [
				{
					id: mediaId,
					fileName: "photo.jpg",
					logicalPath: "2026/01",
					contentType: "image/jpeg",
					byteSize: 1024,
					width: 4000,
					height: 3000,
					hasThumbnail: true,
					uploadedAt: uploadedAt.toISOString(),
				},
			],
			nextCursor: null,
		});
	});

	it("passes the filter and the cursor pair through to the listing", async () => {
		const response = await createApp().request(
			`${uiOrigin}/api/media?logicalPath=2026/01&contentTypePrefix=image/&limit=5&cursorUploadedAt=${uploadedAt.toISOString()}&cursorId=${cursorId}`,
		);

		expect(response.status).toBe(200);
		expect(objectRepository.findPage).toHaveBeenCalledWith({
			trashed: false,
			logicalPath: "2026/01",
			contentTypePrefix: "image/",
			limit: 5,
			cursor: { uploadedAt, id: cursorId },
		});
	});

	it("reads the trash when asked for that side", async () => {
		const response = await createApp().request(
			`${uiOrigin}/api/media?state=trashed`,
		);

		expect(response.status).toBe(200);
		expect(objectRepository.findPage).toHaveBeenCalledWith(
			expect.objectContaining({ trashed: true }),
		);
	});

	it("reads the library side when no state is asked for", async () => {
		await createApp().request(`${uiOrigin}/api/media`);

		expect(objectRepository.findPage).toHaveBeenCalledWith(
			expect.objectContaining({ trashed: false }),
		);
	});

	it("refuses a cursor missing its other half", async () => {
		const response = await createApp().request(
			`${uiOrigin}/api/media?cursorId=${cursorId}`,
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			message: "cursorUploadedAt と cursorId は両方を渡してください",
		});
		expect(objectRepository.findPage).not.toHaveBeenCalled();
	});

	it("refuses a cursor timestamp with no id beside it", async () => {
		const response = await createApp().request(
			`${uiOrigin}/api/media?cursorUploadedAt=${uploadedAt.toISOString()}`,
		);

		expect(response.status).toBe(400);
		expect(objectRepository.findPage).not.toHaveBeenCalled();
	});

	it("names the field and nothing that was passed when the query fails validation", async () => {
		const response = await createApp().request(
			`${uiOrigin}/api/media?limit=9999`,
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			message: "リクエストの項目が不正です: limit",
		});
	});
});

describe("getThumbnail", () => {
	it("returns the image with an ETag the browser can revalidate against", async () => {
		const response = await createApp().request(
			`${uiOrigin}/api/media/${mediaId}/thumbnail`,
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toBe("image/webp");
		expect(response.headers.get("etag")).toBe('W/"abc123"');
		expect(response.headers.get("cache-control")).toBe(
			"private, max-age=0, must-revalidate",
		);
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(
			new Uint8Array([1, 2, 3]),
		);
	});

	it("answers 304 without reading storage when the caller already holds this content", async () => {
		const response = await createApp().request(
			`${uiOrigin}/api/media/${mediaId}/thumbnail`,
			{ headers: { "if-none-match": 'W/"abc123"' } },
		);

		expect(response.status).toBe(304);
		expect(response.headers.get("etag")).toBe('W/"abc123"');
		expect(storageRepository.getThumbnail).not.toHaveBeenCalled();
	});

	it("sends the image again when the caller holds an older one", async () => {
		const response = await createApp().request(
			`${uiOrigin}/api/media/${mediaId}/thumbnail`,
			{ headers: { "if-none-match": 'W/"stale"' } },
		);

		expect(response.status).toBe(200);
		expect(storageRepository.getThumbnail).toHaveBeenCalledWith(mediaId);
	});

	it("answers 404 for a media object whose thumbnail hasn't been generated", async () => {
		objectRepository.findUntrashedById.mockResolvedValue({
			...storedMedia,
			hasThumbnail: false,
		});

		const response = await createApp().request(
			`${uiOrigin}/api/media/${mediaId}/thumbnail`,
		);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({
			message: "サムネイルがまだありません",
		});
	});

	it("refuses an id that isn't a UUID", async () => {
		const response = await createApp().request(
			`${uiOrigin}/api/media/not-a-uuid/thumbnail`,
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			message: "リクエストの項目が不正です: id",
		});
		expect(objectRepository.findUntrashedById).not.toHaveBeenCalled();
	});
});

describe("getMediaFile", () => {
	it("returns the original, and says it takes a Range so a video can seek", async () => {
		const response = await createApp().request(
			`${uiOrigin}/api/media/${mediaId}/file`,
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toBe("image/jpeg");
		expect(response.headers.get("content-length")).toBe("4");
		expect(response.headers.get("accept-ranges")).toBe("bytes");
		expect(response.headers.get("etag")).toBe('"abc123"');
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(
			new Uint8Array([4, 5, 6, 7]),
		);
	});

	it("passes the Range through and answers 206 with the range storage reported", async () => {
		storageRepository.get.mockResolvedValue({
			body: new Response(new Uint8Array([5, 6])).body,
			contentType: "image/jpeg",
			byteSize: 2,
			contentRange: "bytes 1-2/4",
			isPartial: true,
		});

		const response = await createApp().request(
			`${uiOrigin}/api/media/${mediaId}/file`,
			{ headers: { range: "bytes=1-2" } },
		);

		expect(response.status).toBe(206);
		expect(response.headers.get("content-range")).toBe("bytes 1-2/4");
		expect(storageRepository.get).toHaveBeenCalledWith({
			key: storedMedia.objectKey,
			range: "bytes=1-2",
		});
	});

	it("carries the file name in a form a non-ASCII name survives", async () => {
		objectRepository.findUntrashedById.mockResolvedValue({
			...storedMedia,
			fileName: "イラスト.jpg",
		});

		const response = await createApp().request(
			`${uiOrigin}/api/media/${mediaId}/file`,
		);

		expect(response.headers.get("content-disposition")).toBe(
			"inline; filename*=UTF-8''%E3%82%A4%E3%83%A9%E3%82%B9%E3%83%88.jpg",
		);
	});

	it("asks the browser to save it rather than show it when download is asked for", async () => {
		const response = await createApp().request(
			`${uiOrigin}/api/media/${mediaId}/file?download=1`,
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("content-disposition")).toBe(
			"attachment; filename*=UTF-8''photo.jpg",
		);
	});

	it("answers 304 without reading storage when the caller already holds this content", async () => {
		const response = await createApp().request(
			`${uiOrigin}/api/media/${mediaId}/file`,
			{ headers: { "if-none-match": '"abc123"' } },
		);

		expect(response.status).toBe(304);
		expect(storageRepository.get).not.toHaveBeenCalled();
	});

	it("answers 404 for a media object that isn't there or has been trashed", async () => {
		objectRepository.findUntrashedById.mockResolvedValue(undefined);

		const response = await createApp().request(
			`${uiOrigin}/api/media/${mediaId}/file`,
		);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({
			message: "そのメディアはありません",
		});
	});

	it("refuses a download value it doesn't define", async () => {
		const response = await createApp().request(
			`${uiOrigin}/api/media/${mediaId}/file?download=yes`,
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			message: "リクエストの項目が不正です: download",
		});
		expect(storageRepository.get).not.toHaveBeenCalled();
	});
});

describe("trashMedia", () => {
	it("marks the media as trashed and answers with nothing to read", async () => {
		const response = await createApp().request(
			`${uiOrigin}/api/media/${mediaId}/trash`,
			{ method: "POST", headers: { origin: uiOrigin } },
		);

		expect(response.status).toBe(204);
		expect(await response.text()).toBe("");
		expect(objectRepository.updateTrashedAt).toHaveBeenCalledWith(
			mediaId,
			expect.any(Date),
		);
	});

	it("answers 404 for a media object that isn't registered", async () => {
		objectRepository.updateTrashedAt.mockResolvedValue(0);

		const response = await createApp().request(
			`${uiOrigin}/api/media/${mediaId}/trash`,
			{ method: "POST", headers: { origin: uiOrigin } },
		);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({
			message: "そのメディアはありません",
		});
	});

	it("turns away a POST from another origin before it reaches the route", async () => {
		const response = await createApp().request(
			`${uiOrigin}/api/media/${mediaId}/trash`,
			{ method: "POST", headers: { origin: "https://example.test" } },
		);

		expect(response.status).toBe(403);
		expect(objectRepository.updateTrashedAt).not.toHaveBeenCalled();
	});
});

describe("restoreMedia", () => {
	it("clears the trashed mark rather than writing a new one", async () => {
		const response = await createApp().request(
			`${uiOrigin}/api/media/${mediaId}/restore`,
			{ method: "POST", headers: { origin: uiOrigin } },
		);

		expect(response.status).toBe(204);
		expect(objectRepository.updateTrashedAt).toHaveBeenCalledWith(
			mediaId,
			null,
		);
	});

	it("answers 404 for a media object that isn't registered", async () => {
		objectRepository.updateTrashedAt.mockResolvedValue(0);

		const response = await createApp().request(
			`${uiOrigin}/api/media/${mediaId}/restore`,
			{ method: "POST", headers: { origin: uiOrigin } },
		);

		expect(response.status).toBe(404);
	});
});
