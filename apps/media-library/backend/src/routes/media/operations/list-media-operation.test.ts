import { beforeEach, describe, expect, it, vi } from "vitest";
import { listMediaOperation } from "./list-media-operation.js";

const objectRepository = vi.hoisted(() => {
	return { findPage: vi.fn() };
});

vi.mock(
	"@eskra-aws-playground/repositories/media/media-object/repository.js",
	() => {
		return { mediaObjectRepository: objectRepository };
	},
);

const mediaId = "11111111-1111-4111-8111-111111111111";
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
});

describe("listMediaOperation", () => {
	it("shapes each object for the screen, leaving its storage key and sync columns behind", async () => {
		objectRepository.findPage.mockResolvedValue({
			objects: [storedMedia],
			nextCursor: undefined,
		});

		const result = await listMediaOperation({ trashed: false, limit: 200 });

		expect(result).toEqual({
			kind: "OK",
			data: {
				objects: [
					{
						id: mediaId,
						fileName: "photo.jpg",
						logicalPath: "2026/01",
						contentType: "image/jpeg",
						byteSize: 1024,
						width: 4000,
						height: 3000,
						durationMs: undefined,
						hasThumbnail: true,
						uploadedAt: uploadedAt.toISOString(),
					},
				],
				nextCursor: null,
			},
		});
	});

	it("hands back the position of the next page as a cursor the caller can send again", async () => {
		objectRepository.findPage.mockResolvedValue({
			objects: [],
			nextCursor: { uploadedAt, id: mediaId },
		});

		const result = await listMediaOperation({ trashed: false, limit: 1 });

		expect(result.data.nextCursor).toEqual({
			uploadedAt: uploadedAt.toISOString(),
			id: mediaId,
		});
	});
});
