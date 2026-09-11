import { beforeEach, describe, expect, it, vi } from "vitest";
import { setMediaTrashedOperation } from "./set-media-trashed-operation.js";

const objectRepository = vi.hoisted(() => {
	return { updateTrashedAt: vi.fn() };
});

vi.mock(
	"@eskra-aws-playground/repositories/media/media-object/repository.js",
	() => {
		return { mediaObjectRepository: objectRepository };
	},
);

const mediaId = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
	objectRepository.updateTrashedAt.mockReset();
	objectRepository.updateTrashedAt.mockResolvedValue(1);
});

describe("setMediaTrashedOperation", () => {
	it("records when it went in, so the trash can be read back in order later", async () => {
		const result = await setMediaTrashedOperation({ mediaId, trashed: true });

		expect(result).toEqual({ kind: "OK", data: undefined });
		expect(objectRepository.updateTrashedAt).toHaveBeenCalledWith(
			mediaId,
			expect.any(Date),
		);
	});

	it("takes it back out by clearing the mark", async () => {
		const result = await setMediaTrashedOperation({ mediaId, trashed: false });

		expect(result).toEqual({ kind: "OK", data: undefined });
		expect(objectRepository.updateTrashedAt).toHaveBeenCalledWith(
			mediaId,
			null,
		);
	});

	it("reports NOT_FOUND when no row carried that id", async () => {
		objectRepository.updateTrashedAt.mockResolvedValue(0);

		const result = await setMediaTrashedOperation({ mediaId, trashed: true });

		expect(result).toEqual({ kind: "NOT_FOUND" });
	});
});
