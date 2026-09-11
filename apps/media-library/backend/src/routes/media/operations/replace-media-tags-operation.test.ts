import { beforeEach, describe, expect, it, vi } from "vitest";
import { replaceMediaTagsOperation } from "./replace-media-tags-operation.js";

const objectRepository = vi.hoisted(() => {
	return { findUntrashedById: vi.fn() };
});

vi.mock(
	"@eskra-aws-playground/repositories/media/media-object/repository.js",
	() => {
		return { mediaObjectRepository: objectRepository };
	},
);

const tagRepository = vi.hoisted(() => {
	return { replaceObjectTags: vi.fn() };
});

vi.mock(
	"@eskra-aws-playground/repositories/media/media-tag/repository.js",
	() => {
		return { mediaTagRepository: tagRepository };
	},
);

const mediaId = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
	objectRepository.findUntrashedById.mockReset();
	objectRepository.findUntrashedById.mockResolvedValue({ id: mediaId });
	tagRepository.replaceObjectTags.mockReset();
	tagRepository.replaceObjectTags.mockResolvedValue([{ id: 2, name: "風景" }]);
});

describe("replaceMediaTagsOperation", () => {
	it("answers with the names the tags were stored under", async () => {
		const result = await replaceMediaTagsOperation({
			mediaId,
			tagNames: ["風景"],
		});

		expect(result).toEqual({ kind: "OK", data: { tags: ["風景"] } });
	});

	it("trims, drops blanks and de-duplicates, so one set of names is always one set of rows", async () => {
		await replaceMediaTagsOperation({
			mediaId,
			tagNames: [" 風景 ", "風景", "   ", "資料"],
		});

		expect(tagRepository.replaceObjectTags).toHaveBeenCalledWith(mediaId, [
			"風景",
			"資料",
		]);
	});

	it("reports NOT_FOUND without creating a tag for a media object that isn't there", async () => {
		objectRepository.findUntrashedById.mockResolvedValue(undefined);

		const result = await replaceMediaTagsOperation({
			mediaId,
			tagNames: ["風景"],
		});

		expect(result).toEqual({ kind: "NOT_FOUND" });
		expect(tagRepository.replaceObjectTags).not.toHaveBeenCalled();
	});
});
