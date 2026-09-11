import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMediaFileOperation } from "./get-media-file-operation.js";

const objectRepository = vi.hoisted(() => {
	return { findById: vi.fn() };
});

vi.mock(
	"@eskra-aws-playground/repositories/media/media-object/repository.js",
	() => {
		return { mediaObjectRepository: objectRepository };
	},
);

const storageRepository = vi.hoisted(() => {
	return { get: vi.fn() };
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
	objectKey: "library/2026/01/02/clip.mp4",
	logicalPath: "2026/01",
	fileName: "clip.mp4",
	contentType: "video/mp4",
	byteSize: 1024,
	etag: "abc123",
	width: 1920,
	height: 1080,
	durationMs: 12_000,
	hasThumbnail: true,
	uploadedAt: new Date("2026-01-02T03:04:05.000Z"),
	syncedAt: new Date("2026-01-02T03:04:05.000Z"),
	trashedAt: undefined,
};

const storedBody = () => {
	return {
		body: new Response(new Uint8Array([1, 2, 3])).body,
		contentType: "application/octet-stream",
		byteSize: 3,
		contentRange: undefined,
		isPartial: false,
	};
};

beforeEach(() => {
	objectRepository.findById.mockReset();
	objectRepository.findById.mockResolvedValue(storedMedia);
	storageRepository.get.mockReset();
	storageRepository.get.mockResolvedValue(storedBody());
});

describe("getMediaFileOperation", () => {
	it("reads the original under the key held for it, and reports the type it was taken in as", async () => {
		const result = await getMediaFileOperation({
			mediaId,
			range: undefined,
			knownEtags: [],
		});

		expect(storageRepository.get).toHaveBeenCalledWith({
			key: storedMedia.objectKey,
			range: undefined,
		});
		expect(result).toMatchObject({
			kind: "OK",
			data: {
				// Storage reports application/octet-stream here, which no <video> would play
				contentType: "video/mp4",
				byteSize: 3,
				isPartial: false,
				fileName: "clip.mp4",
				etag: "abc123",
			},
		});
	});

	it("passes a range through and carries back what storage answered with", async () => {
		storageRepository.get.mockResolvedValue({
			...storedBody(),
			contentRange: "bytes 0-1/3",
			isPartial: true,
		});

		const result = await getMediaFileOperation({
			mediaId,
			range: "bytes=0-1",
			knownEtags: [],
		});

		expect(storageRepository.get).toHaveBeenCalledWith({
			key: storedMedia.objectKey,
			range: "bytes=0-1",
		});
		expect(result).toMatchObject({
			kind: "OK",
			data: { contentRange: "bytes 0-1/3", isPartial: true },
		});
	});

	it("reports it missing only when no row carries the id", async () => {
		objectRepository.findById.mockResolvedValue(undefined);

		const result = await getMediaFileOperation({
			mediaId,
			range: undefined,
			knownEtags: [],
		});

		expect(result).toEqual({ kind: "NOT_FOUND" });
		expect(storageRepository.get).not.toHaveBeenCalled();
	});

	it("reports NOT_MODIFIED without touching storage when the caller holds this etag", async () => {
		const result = await getMediaFileOperation({
			mediaId,
			range: undefined,
			knownEtags: ["other", "abc123"],
		});

		expect(result).toEqual({ kind: "NOT_MODIFIED", etag: "abc123" });
		expect(storageRepository.get).not.toHaveBeenCalled();
	});

	it("still answers a range request holding that etag, since 304 would drop the part it asked for", async () => {
		const result = await getMediaFileOperation({
			mediaId,
			range: "bytes=0-1",
			knownEtags: ["abc123"],
		});

		expect(result.kind).toBe("OK");
		expect(storageRepository.get).toHaveBeenCalled();
	});
});
