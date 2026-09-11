import { beforeEach, describe, expect, it, vi } from "vitest";
import { copyMediaToClipboardOperation } from "./copy-media-to-clipboard-operation.js";

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
	return { get: vi.fn() };
});

vi.mock(
	"@eskra-aws-playground/repositories/media/media-storage/repository.js",
	() => {
		return { mediaStorageRepository: storageRepository };
	},
);

const windowsClipboard = vi.hoisted(() => {
	return { copyFileToWindowsClipboard: vi.fn() };
});

vi.mock("../../../features/windows-clipboard/file-clipboard.js", () => {
	return windowsClipboard;
});

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

const storedBody = new Response(new Uint8Array([1, 2, 3])).body;

beforeEach(() => {
	objectRepository.findUntrashedById.mockReset();
	objectRepository.findUntrashedById.mockResolvedValue(storedMedia);
	storageRepository.get.mockReset();
	storageRepository.get.mockResolvedValue({
		body: storedBody,
		contentType: "image/jpeg",
		byteSize: 3,
		contentRange: undefined,
		isPartial: false,
	});
	windowsClipboard.copyFileToWindowsClipboard.mockReset();
	windowsClipboard.copyFileToWindowsClipboard.mockResolvedValue(undefined);
});

describe("copyMediaToClipboardOperation", () => {
	it("hands the original over under the name it was taken in as", async () => {
		const result = await copyMediaToClipboardOperation({ mediaId });

		expect(result).toEqual({ kind: "OK", data: undefined });
		expect(storageRepository.get).toHaveBeenCalledWith({
			key: storedMedia.objectKey,
		});
		expect(windowsClipboard.copyFileToWindowsClipboard).toHaveBeenCalledWith({
			mediaId,
			fileName: "photo.jpg",
			body: storedBody,
		});
	});

	it("reports NOT_FOUND for a media object that isn't there or has been trashed", async () => {
		objectRepository.findUntrashedById.mockResolvedValue(undefined);

		const result = await copyMediaToClipboardOperation({ mediaId });

		expect(result).toEqual({ kind: "NOT_FOUND" });
		expect(storageRepository.get).not.toHaveBeenCalled();
		expect(windowsClipboard.copyFileToWindowsClipboard).not.toHaveBeenCalled();
	});
});
