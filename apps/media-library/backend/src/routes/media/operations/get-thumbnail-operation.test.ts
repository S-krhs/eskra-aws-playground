import { beforeEach, describe, expect, it, vi } from "vitest";
import { getThumbnailOperation } from "./get-thumbnail-operation.js";

const objectRepository = vi.hoisted(() => {
	return { findUntrashedById: vi.fn() };
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

const mediaId = "11111111-1111-4111-8111-111111111111";

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
	uploadedAt: new Date("2026-01-02T03:04:05.000Z"),
	syncedAt: new Date("2026-01-02T03:04:05.000Z"),
	trashedAt: undefined,
};

beforeEach(() => {
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

describe("getThumbnailOperation", () => {
	it("reads the thumbnail out of storage and carries the etag identifying it", async () => {
		const result = await getThumbnailOperation({ mediaId, knownEtags: [] });

		expect(result).toEqual({
			kind: "OK",
			data: {
				body: new Uint8Array([1, 2, 3]),
				contentType: "image/webp",
				etag: "abc123",
			},
		});
	});

	it("reads the row through the exclusion the listing applies, so a trashed one is unreachable", async () => {
		objectRepository.findUntrashedById.mockResolvedValue(undefined);

		const result = await getThumbnailOperation({ mediaId, knownEtags: [] });

		expect(objectRepository.findUntrashedById).toHaveBeenCalledWith(mediaId);
		expect(result).toEqual({ kind: "NOT_GENERATED" });
		expect(storageRepository.getThumbnail).not.toHaveBeenCalled();
	});

	it("reports NOT_GENERATED while the sync hasn't made one", async () => {
		objectRepository.findUntrashedById.mockResolvedValue({
			...storedMedia,
			hasThumbnail: false,
		});

		const result = await getThumbnailOperation({ mediaId, knownEtags: [] });

		expect(result).toEqual({ kind: "NOT_GENERATED" });
		expect(storageRepository.getThumbnail).not.toHaveBeenCalled();
	});

	it("reports NOT_MODIFIED without touching storage when the caller holds this etag", async () => {
		const result = await getThumbnailOperation({
			mediaId,
			knownEtags: ["other", "abc123"],
		});

		expect(result).toEqual({ kind: "NOT_MODIFIED", etag: "abc123" });
		expect(storageRepository.getThumbnail).not.toHaveBeenCalled();
	});

	it("reads storage again when the caller holds an etag from before the content changed", async () => {
		const result = await getThumbnailOperation({
			mediaId,
			knownEtags: ["stale"],
		});

		expect(result.kind).toBe("OK");
		expect(storageRepository.getThumbnail).toHaveBeenCalledWith(mediaId);
	});
});
