import { beforeEach, describe, expect, it, vi } from "vitest";
import { trashMediaOperation } from "./trash-media-operation.js";

const objectRepository = vi.hoisted(() => {
	return { findUntrashedById: vi.fn(), updateTrashedLocation: vi.fn() };
});

vi.mock(
	"@eskra-aws-playground/repositories/media/media-object/repository.js",
	() => {
		return { mediaObjectRepository: objectRepository };
	},
);

const storageRepository = vi.hoisted(() => {
	return { moveIntoArea: vi.fn() };
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
	objectKey: "photos/2024/20260907-133045123.png",
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
	trashedAt: undefined,
};

beforeEach(() => {
	objectRepository.findUntrashedById.mockReset();
	objectRepository.findUntrashedById.mockResolvedValue(storedMedia);
	objectRepository.updateTrashedLocation.mockReset();
	objectRepository.updateTrashedLocation.mockResolvedValue(1);
	storageRepository.moveIntoArea.mockReset();
	storageRepository.moveIntoArea.mockResolvedValue({
		key: "_deleted/photos/2024/20260907-133045123.png",
		logicalPath: "photos/2024",
		byteSize: 1024,
		etag: "def456",
	});
});

describe("trashMediaOperation", () => {
	it("moves the stored object into the trash, folder and all", async () => {
		const result = await trashMediaOperation({ mediaId });

		expect(storageRepository.moveIntoArea).toHaveBeenCalledWith({
			key: storedMedia.objectKey,
			area: "deleted",
			logicalPath: "photos/2024",
		});
		expect(result).toEqual({ kind: "OK", data: undefined });
	});

	it("records the trash mark together with where the object went", async () => {
		await trashMediaOperation({ mediaId });

		expect(objectRepository.updateTrashedLocation).toHaveBeenCalledWith(
			expect.objectContaining({
				id: mediaId,
				objectKey: "_deleted/photos/2024/20260907-133045123.png",
				logicalPath: "photos/2024",
				etag: "def456",
				trashedAt: expect.any(Date),
			}),
		);
	});

	it("reports NOT_FOUND without touching storage for one that isn't there or is already trashed", async () => {
		objectRepository.findUntrashedById.mockResolvedValue(undefined);

		const result = await trashMediaOperation({ mediaId });

		expect(result).toEqual({ kind: "NOT_FOUND" });
		expect(storageRepository.moveIntoArea).not.toHaveBeenCalled();
	});
});
