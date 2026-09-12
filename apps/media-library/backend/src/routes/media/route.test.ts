import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app.js";

const objectRepository = vi.hoisted(() => {
	return {
		findPage: vi.fn(),
		findById: vi.fn(),
		findUntrashedById: vi.fn(),
		updateTrashedLocation: vi.fn(),
		relocateMany: vi.fn(),
		findAllLogicalPaths: vi.fn(),
	};
});

vi.mock(
	"@eskra-aws-playground/repositories/media/media-object/repository.js",
	() => {
		return { mediaObjectRepository: objectRepository };
	},
);

const storageRepository = vi.hoisted(() => {
	return {
		getThumbnail: vi.fn(),
		get: vi.fn(),
		moveIntoArea: vi.fn(),
		moveToLogicalPath: vi.fn(),
	};
});

vi.mock(
	"@eskra-aws-playground/repositories/media/media-storage/repository.js",
	() => {
		return { mediaStorageRepository: storageRepository };
	},
);

const folderRepository = vi.hoisted(() => {
	return { findAll: vi.fn(), insert: vi.fn() };
});

vi.mock(
	"@eskra-aws-playground/repositories/media/media-folder/repository.js",
	() => {
		return { mediaFolderRepository: folderRepository };
	},
);

const tagRepository = vi.hoisted(() => {
	return { findAll: vi.fn(), replaceObjectTags: vi.fn() };
});

vi.mock(
	"@eskra-aws-playground/repositories/media/media-tag/repository.js",
	() => {
		return { mediaTagRepository: tagRepository };
	},
);

const windowsClipboard = vi.hoisted(() => {
	return { copyFileToWindowsClipboard: vi.fn() };
});

vi.mock("../../features/windows-clipboard/file-clipboard.js", () => {
	return windowsClipboard;
});

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
	tags: ["風景"],
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
	objectRepository.findById.mockReset();
	objectRepository.findById.mockResolvedValue(storedMedia);
	objectRepository.updateTrashedLocation.mockReset();
	objectRepository.updateTrashedLocation.mockResolvedValue(1);
	windowsClipboard.copyFileToWindowsClipboard.mockReset();
	windowsClipboard.copyFileToWindowsClipboard.mockResolvedValue(undefined);
	tagRepository.findAll.mockReset();
	tagRepository.findAll.mockResolvedValue([
		{ id: 1, name: "資料" },
		{ id: 2, name: "風景" },
	]);
	tagRepository.replaceObjectTags.mockReset();
	tagRepository.replaceObjectTags.mockResolvedValue([{ id: 2, name: "風景" }]);
	objectRepository.relocateMany.mockReset();
	objectRepository.relocateMany.mockResolvedValue(1);
	objectRepository.findAllLogicalPaths.mockReset();
	objectRepository.findAllLogicalPaths.mockResolvedValue(["2026/01"]);
	storageRepository.moveIntoArea.mockReset();
	storageRepository.moveIntoArea.mockResolvedValue({
		key: "_deleted/2026/01/photo.jpg",
		logicalPath: "2026/01",
		byteSize: 1024,
		etag: "def456",
	});
	storageRepository.moveToLogicalPath.mockReset();
	storageRepository.moveToLogicalPath.mockResolvedValue({
		key: "photos/2024/photo.jpg",
		logicalPath: "photos/2024",
		byteSize: 1024,
		etag: "def456",
	});
	folderRepository.findAll.mockReset();
	folderRepository.findAll.mockResolvedValue(["photos/2024"]);
	folderRepository.insert.mockReset();
	folderRepository.insert.mockResolvedValue(undefined);
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
					tags: ["風景"],
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
			state: "filed",
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
			expect.objectContaining({ state: "trashed" }),
		);
	});

	it("reads what is waiting in the inbox when asked for that side", async () => {
		const response = await createApp().request(
			`${uiOrigin}/api/media?state=inbox`,
		);

		expect(response.status).toBe(200);
		expect(objectRepository.findPage).toHaveBeenCalledWith(
			expect.objectContaining({ state: "inbox" }),
		);
	});

	it("reads the library side when no state is asked for", async () => {
		await createApp().request(`${uiOrigin}/api/media`);

		expect(objectRepository.findPage).toHaveBeenCalledWith(
			expect.objectContaining({ state: "filed" }),
		);
	});

	it("narrows the listing to one tag", async () => {
		await createApp().request(`${uiOrigin}/api/media?tag=風景`);

		expect(objectRepository.findPage).toHaveBeenCalledWith(
			expect.objectContaining({ tagName: "風景" }),
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
		objectRepository.findById.mockResolvedValue({
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
		expect(objectRepository.findById).not.toHaveBeenCalled();
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
		objectRepository.findById.mockResolvedValue({
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

	it("escapes the characters encodeURIComponent leaves behind, which an ext-value has no room for", async () => {
		objectRepository.findById.mockResolvedValue({
			...storedMedia,
			fileName: "Don't Stop (2024)*.mp4",
		});

		const response = await createApp().request(
			`${uiOrigin}/api/media/${mediaId}/file`,
		);

		expect(response.headers.get("content-disposition")).toBe(
			"inline; filename*=UTF-8''Don%27t%20Stop%20%282024%29%2A.mp4",
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

	it("answers 404 only when no row carries the id", async () => {
		objectRepository.findById.mockResolvedValue(undefined);

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
	it("moves the stored object into the trash and answers with nothing to read", async () => {
		const response = await createApp().request(
			`${uiOrigin}/api/media/${mediaId}/trash`,
			{ method: "POST", headers: { origin: uiOrigin } },
		);

		expect(response.status).toBe(204);
		expect(await response.text()).toBe("");
		expect(storageRepository.moveIntoArea).toHaveBeenCalledWith({
			key: storedMedia.objectKey,
			area: "deleted",
			logicalPath: storedMedia.logicalPath,
		});
		expect(objectRepository.updateTrashedLocation).toHaveBeenCalledWith(
			expect.objectContaining({ id: mediaId, trashedAt: expect.any(Date) }),
		);
	});

	it("answers 404 for a media object that isn't registered", async () => {
		objectRepository.findUntrashedById.mockResolvedValue(undefined);

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
		expect(storageRepository.moveIntoArea).not.toHaveBeenCalled();
	});
});

describe("restoreMedia", () => {
	it("puts the object back under its folder and clears the mark", async () => {
		objectRepository.findById.mockResolvedValue({
			...storedMedia,
			objectKey: "_deleted/2026/01/photo.jpg",
			trashedAt: new Date("2026-09-11T00:00:00.000Z"),
		});

		const response = await createApp().request(
			`${uiOrigin}/api/media/${mediaId}/restore`,
			{ method: "POST", headers: { origin: uiOrigin } },
		);

		expect(response.status).toBe(204);
		expect(storageRepository.moveToLogicalPath).toHaveBeenCalledWith({
			key: "_deleted/2026/01/photo.jpg",
			logicalPath: storedMedia.logicalPath,
		});
		expect(objectRepository.updateTrashedLocation).toHaveBeenCalledWith(
			expect.objectContaining({ id: mediaId, trashedAt: null }),
		);
	});

	it("answers 404 for a media object that isn't registered", async () => {
		objectRepository.findById.mockResolvedValue(undefined);

		const response = await createApp().request(
			`${uiOrigin}/api/media/${mediaId}/restore`,
			{ method: "POST", headers: { origin: uiOrigin } },
		);

		expect(response.status).toBe(404);
	});
});

describe("copyMediaToClipboard", () => {
	it("puts the original on the clipboard and answers with nothing to read", async () => {
		const response = await createApp().request(
			`${uiOrigin}/api/media/${mediaId}/clipboard`,
			{ method: "POST", headers: { origin: uiOrigin } },
		);

		expect(response.status).toBe(204);
		expect(windowsClipboard.copyFileToWindowsClipboard).toHaveBeenCalledWith(
			expect.objectContaining({ mediaId, fileName: "photo.jpg" }),
		);
	});

	it("answers 404 only when no row carries the id", async () => {
		objectRepository.findById.mockResolvedValue(undefined);

		const response = await createApp().request(
			`${uiOrigin}/api/media/${mediaId}/clipboard`,
			{ method: "POST", headers: { origin: uiOrigin } },
		);

		expect(response.status).toBe(404);
		expect(windowsClipboard.copyFileToWindowsClipboard).not.toHaveBeenCalled();
	});
});

describe("replaceMediaTags", () => {
	it("takes a well-formed list and hands the stored names back", async () => {
		const response = await createApp().request(
			`${uiOrigin}/api/media/${mediaId}/tags`,
			{
				method: "PUT",
				headers: { origin: uiOrigin, "content-type": "application/json" },
				body: JSON.stringify({ tags: ["風景"] }),
			},
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ tags: ["風景"] });
		expect(tagRepository.replaceObjectTags).toHaveBeenCalledWith(mediaId, [
			"風景",
		]);
	});

	it("refuses a blank tag rather than storing one nothing can be filtered by", async () => {
		const response = await createApp().request(
			`${uiOrigin}/api/media/${mediaId}/tags`,
			{
				method: "PUT",
				headers: { origin: uiOrigin, "content-type": "application/json" },
				body: JSON.stringify({ tags: [""] }),
			},
		);

		expect(response.status).toBe(400);
		expect(tagRepository.replaceObjectTags).not.toHaveBeenCalled();
	});

	it("answers 404 for a media object that isn't there or has been trashed", async () => {
		objectRepository.findUntrashedById.mockResolvedValue(undefined);

		const response = await createApp().request(
			`${uiOrigin}/api/media/${mediaId}/tags`,
			{
				method: "PUT",
				headers: { origin: uiOrigin, "content-type": "application/json" },
				body: JSON.stringify({ tags: ["風景"] }),
			},
		);

		expect(response.status).toBe(404);
		expect(tagRepository.replaceObjectTags).not.toHaveBeenCalled();
	});
});

describe("listTags", () => {
	it("answers with the tag names in use, and not their ids", async () => {
		const response = await createApp().request(`${uiOrigin}/api/tags`);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ tags: ["資料", "風景"] });
	});
});

describe("moveMedia", () => {
	it("files the media into the folder and answers with where it landed", async () => {
		const response = await createApp().request(
			`${uiOrigin}/api/media/${mediaId}`,
			{
				method: "PATCH",
				headers: { origin: uiOrigin, "content-type": "application/json" },
				body: JSON.stringify({ logicalPath: "photos/2024" }),
			},
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ logicalPath: "photos/2024" });
		expect(storageRepository.moveToLogicalPath).toHaveBeenCalledWith({
			key: storedMedia.objectKey,
			logicalPath: "photos/2024",
		});
	});

	it("refuses a path under a name the storage keeps for itself", async () => {
		const response = await createApp().request(
			`${uiOrigin}/api/media/${mediaId}`,
			{
				method: "PATCH",
				headers: { origin: uiOrigin, "content-type": "application/json" },
				body: JSON.stringify({ logicalPath: "_thumb/sneaky" }),
			},
		);

		expect(response.status).toBe(400);
		expect(storageRepository.moveToLogicalPath).not.toHaveBeenCalled();
	});

	it("refuses a path that climbs out of the folder it names", async () => {
		const response = await createApp().request(
			`${uiOrigin}/api/media/${mediaId}`,
			{
				method: "PATCH",
				headers: { origin: uiOrigin, "content-type": "application/json" },
				body: JSON.stringify({ logicalPath: "photos/../../etc" }),
			},
		);

		expect(response.status).toBe(400);
		expect(storageRepository.moveToLogicalPath).not.toHaveBeenCalled();
	});
});

describe("listFolders", () => {
	it("answers with the registered folders and the ones media is filed in", async () => {
		const response = await createApp().request(`${uiOrigin}/api/folders`);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			folders: ["2026/01", "photos/2024"],
		});
	});
});
