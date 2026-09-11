import { beforeEach, describe, expect, it, vi } from "vitest";
import { listFoldersOperation } from "./list-folders-operation.js";

const folderRepository = vi.hoisted(() => {
	return { findAll: vi.fn() };
});

vi.mock(
	"@eskra-aws-playground/repositories/media/media-folder/repository.js",
	() => {
		return { mediaFolderRepository: folderRepository };
	},
);

const objectRepository = vi.hoisted(() => {
	return { findAllLogicalPaths: vi.fn() };
});

vi.mock(
	"@eskra-aws-playground/repositories/media/media-object/repository.js",
	() => {
		return { mediaObjectRepository: objectRepository };
	},
);

beforeEach(() => {
	folderRepository.findAll.mockReset();
	folderRepository.findAll.mockResolvedValue(["photos/2024", "空のフォルダ"]);
	objectRepository.findAllLogicalPaths.mockReset();
	objectRepository.findAllLogicalPaths.mockResolvedValue([
		"illust",
		"photos/2024",
	]);
});

describe("listFoldersOperation", () => {
	it("puts the registered folders and the ones in use together, each one once", async () => {
		const result = await listFoldersOperation();

		expect(result).toEqual({
			kind: "OK",
			data: { folders: ["illust", "photos/2024", "空のフォルダ"] },
		});
	});
});
