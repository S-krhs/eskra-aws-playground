import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app.js";

const objectRepository = vi.hoisted(() => {
	return { findPage: vi.fn(), findUntrashedById: vi.fn() };
});

vi.mock(
	"@eskra-aws-playground/repositories/media/media-object/repository.js",
	() => {
		return { mediaObjectRepository: objectRepository };
	},
);

const storageRepository = vi.hoisted(() => {
	return { getThumbnail: vi.fn() };
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
	storageRepository.getThumbnail.mockReset();
	storageRepository.getThumbnail.mockResolvedValue({
		body: new Response(new Uint8Array([1, 2, 3])).body,
		contentType: "image/webp",
		byteSize: 3,
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
			logicalPath: "2026/01",
			contentTypePrefix: "image/",
			limit: 5,
			cursor: { uploadedAt, id: cursorId },
		});
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
