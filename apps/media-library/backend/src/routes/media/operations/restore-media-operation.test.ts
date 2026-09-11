import { beforeEach, describe, expect, it, vi } from "vitest";
import { restoreMediaOperation } from "./restore-media-operation.js";

const objectRepository = vi.hoisted(() => {
	return { findById: vi.fn(), updateTrashedLocation: vi.fn() };
});

vi.mock(
	"@eskra-aws-playground/repositories/media/media-object/repository.js",
	() => {
		return { mediaObjectRepository: objectRepository };
	},
);

const storageRepository = vi.hoisted(() => {
	return { moveToLogicalPath: vi.fn() };
});

vi.mock(
	"@eskra-aws-playground/repositories/media/media-storage/repository.js",
	() => {
		return { mediaStorageRepository: storageRepository };
	},
);

const mediaId = "11111111-1111-4111-8111-111111111111";

const trashedMedia = {
	id: mediaId,
	objectKey: "_deleted/photos/2024/20260907-133045123.png",
	logicalPath: "photos/2024",
	fileName: "イラスト.png",
	contentType: "image/png",
	byteSize: 1024,
	etag: "abc123",
	width: undefined,
	height: undefined,
	durationMs: undefined,
	hasThumbnail: true,
	tags: [],
	uploadedAt: new Date("2026-01-02T03:04:05.000Z"),
	syncedAt: new Date("2026-01-02T03:04:05.000Z"),
	trashedAt: new Date("2026-09-11T00:00:00.000Z"),
};

beforeEach(() => {
	objectRepository.findById.mockReset();
	objectRepository.findById.mockResolvedValue(trashedMedia);
	objectRepository.updateTrashedLocation.mockReset();
	objectRepository.updateTrashedLocation.mockResolvedValue(1);
	storageRepository.moveToLogicalPath.mockReset();
	storageRepository.moveToLogicalPath.mockResolvedValue({
		key: "photos/2024/20260907-133045123.png",
		logicalPath: "photos/2024",
		byteSize: 1024,
		etag: "def456",
	});
});

describe("restoreMediaOperation", () => {
	it("puts the object back under the folder it was filed in, and clears the mark", async () => {
		const result = await restoreMediaOperation({ mediaId });

		expect(storageRepository.moveToLogicalPath).toHaveBeenCalledWith({
			key: trashedMedia.objectKey,
			logicalPath: "photos/2024",
		});
		expect(objectRepository.updateTrashedLocation).toHaveBeenCalledWith(
			expect.objectContaining({
				id: mediaId,
				trashedAt: null,
				objectKey: "photos/2024/20260907-133045123.png",
			}),
		);
		expect(result).toEqual({ kind: "OK", data: undefined });
	});

	it("leaves one that isn't in the trash where it already is", async () => {
		objectRepository.findById.mockResolvedValue({
			...trashedMedia,
			trashedAt: undefined,
		});

		const result = await restoreMediaOperation({ mediaId });

		expect(result).toEqual({ kind: "OK", data: undefined });
		expect(storageRepository.moveToLogicalPath).not.toHaveBeenCalled();
		expect(objectRepository.updateTrashedLocation).not.toHaveBeenCalled();
	});

	it("reports NOT_FOUND when no row carries the id", async () => {
		objectRepository.findById.mockResolvedValue(undefined);

		const result = await restoreMediaOperation({ mediaId });

		expect(result).toEqual({ kind: "NOT_FOUND" });
		expect(storageRepository.moveToLogicalPath).not.toHaveBeenCalled();
	});
});
