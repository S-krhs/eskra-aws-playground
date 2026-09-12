import { beforeEach, describe, expect, it, vi } from "vitest";
import { moveMediaOperation } from "./move-media-operation.js";

const objectRepository = vi.hoisted(() => {
	return { findUntrashedById: vi.fn(), relocateMany: vi.fn() };
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

const folderRepository = vi.hoisted(() => {
	return { insert: vi.fn() };
});

vi.mock(
	"@eskra-aws-playground/repositories/media/media-folder/repository.js",
	() => {
		return { mediaFolderRepository: folderRepository };
	},
);

const mediaId = "11111111-1111-4111-8111-111111111111";

const storedMedia = {
	id: mediaId,
	objectKey: "_inbox/20260907-133045123.png",
	logicalPath: "",
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
	objectRepository.relocateMany.mockReset();
	objectRepository.relocateMany.mockResolvedValue(1);
	storageRepository.moveToLogicalPath.mockReset();
	storageRepository.moveToLogicalPath.mockResolvedValue({
		key: "photos/2024/20260907-133045123.png",
		logicalPath: "photos/2024",
		byteSize: 1024,
		// A copy can land on an etag of its own, which is why the row takes the one read back
		etag: "def456",
	});
	folderRepository.insert.mockReset();
	folderRepository.insert.mockResolvedValue(undefined);
});

describe("moveMediaOperation", () => {
	it("moves the stored object and re-points the row at where it landed", async () => {
		const result = await moveMediaOperation({
			mediaId,
			logicalPath: "photos/2024",
		});

		expect(storageRepository.moveToLogicalPath).toHaveBeenCalledWith({
			key: storedMedia.objectKey,
			logicalPath: "photos/2024",
		});
		expect(objectRepository.relocateMany).toHaveBeenCalledWith([
			expect.objectContaining({
				id: mediaId,
				objectKey: "photos/2024/20260907-133045123.png",
				logicalPath: "photos/2024",
				etag: "def456",
			}),
		]);
		expect(result).toEqual({
			kind: "OK",
			data: { logicalPath: "photos/2024" },
		});
	});

	it("registers the folder, so it stays on offer once its last media moves out", async () => {
		await moveMediaOperation({ mediaId, logicalPath: "photos/2024" });

		expect(folderRepository.insert).toHaveBeenCalledWith("photos/2024");
	});

	it("registers no folder when the media is taken back out of every folder", async () => {
		storageRepository.moveToLogicalPath.mockResolvedValue({
			key: "_inbox/20260907-133045123.png",
			logicalPath: "",
			byteSize: 1024,
			etag: "abc123",
		});

		const result = await moveMediaOperation({ mediaId, logicalPath: "" });

		expect(result).toEqual({ kind: "OK", data: { logicalPath: "" } });
		expect(folderRepository.insert).not.toHaveBeenCalled();
	});

	it("reports NOT_FOUND without touching storage for a media object that isn't there", async () => {
		objectRepository.findUntrashedById.mockResolvedValue(undefined);

		const result = await moveMediaOperation({
			mediaId,
			logicalPath: "photos/2024",
		});

		expect(result).toEqual({ kind: "NOT_FOUND" });
		expect(storageRepository.moveToLogicalPath).not.toHaveBeenCalled();
	});
});
