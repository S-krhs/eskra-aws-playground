import type { MediaAdoptMessage } from "@eskra-aws-playground/shared-domains/media/jobs/adopt-message.js";
import { mediaJobNames } from "@eskra-aws-playground/shared-domains/media/jobs/names.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mediaAdoptJob } from "./media-adopt-job.js";

const mediaObjectRepository = vi.hoisted(() => {
	return { insertMany: vi.fn() };
});
const mediaStorageRepository = vi.hoisted(() => {
	return { headIfExists: vi.fn(), copyIntoArea: vi.fn(), delete: vi.fn() };
});
const sqs = vi.hoisted(() => {
	return { sendMessages: vi.fn() };
});

vi.mock(
	"@eskra-aws-playground/repositories/media/media-object/repository.js",
	() => {
		return { mediaObjectRepository };
	},
);
vi.mock(
	"@eskra-aws-playground/repositories/media/media-storage/repository.js",
	() => {
		return { mediaStorageRepository };
	},
);
vi.mock("@eskra-aws-playground/integration-sqs/sqs-message-sender.js", () => {
	return {
		SqsMessageSender: class {
			public sendMessages = sqs.sendMessages;
		},
	};
});
vi.mock("sst/resource", () => {
	return { Resource: { MediaThumbnailQueue: { url: "thumbnail-queue" } } };
});

const message: MediaAdoptMessage = {
	job: mediaJobNames.mediaAdopt,
	objectKey: "photos/山.MP4",
};

beforeEach(() => {
	vi.clearAllMocks();
	mediaStorageRepository.headIfExists.mockResolvedValue({
		contentType: "application/octet-stream",
		byteSize: 10,
		etag: "e1",
		lastModified: new Date("2026-09-01T00:00:00.000Z"),
		metadata: {},
	});
	mediaStorageRepository.copyIntoArea.mockResolvedValue({
		key: "_inbox/20260901-090000000.mp4",
		logicalPath: "",
		byteSize: 10,
		etag: "e1",
	});
	mediaStorageRepository.delete.mockResolvedValue(undefined);
	mediaObjectRepository.insertMany.mockResolvedValue(1);
	sqs.sendMessages.mockResolvedValue(undefined);
});

describe("mediaAdoptJob", () => {
	it("stops when the source is already gone", async () => {
		mediaStorageRepository.headIfExists.mockResolvedValue(undefined);

		await mediaAdoptJob(message);

		expect(mediaStorageRepository.copyIntoArea).not.toHaveBeenCalled();
		expect(mediaObjectRepository.insertMany).not.toHaveBeenCalled();
	});

	it("takes the content type from the extension rather than the stored header", async () => {
		await mediaAdoptJob(message);

		expect(mediaStorageRepository.copyIntoArea).toHaveBeenCalledWith(
			expect.objectContaining({ contentType: "video/mp4" }),
		);
		expect(mediaObjectRepository.insertMany).toHaveBeenCalledWith([
			expect.objectContaining({ contentType: "video/mp4" }),
		]);
	});

	it("refuses an extension that is not on the allowlist", async () => {
		await expect(
			mediaAdoptJob({ ...message, objectKey: "photos/notes.txt" }),
		).rejects.toThrow("取り込み対象の拡張子が許可されていません");
	});

	it("gives a redelivery the same media id so the retry converges on one object", async () => {
		await mediaAdoptJob(message);
		const first = mediaObjectRepository.insertMany.mock.calls[0]?.[0][0].id;

		await mediaAdoptJob(message);
		const second = mediaObjectRepository.insertMany.mock.calls[1]?.[0][0].id;

		expect(second).toBe(first);
	});

	it("gives a file put back under the same name an id of its own", async () => {
		await mediaAdoptJob(message);
		const first = mediaObjectRepository.insertMany.mock.calls[0]?.[0][0].id;

		mediaStorageRepository.headIfExists.mockResolvedValue({
			contentType: "video/mp4",
			byteSize: 10,
			etag: "e2",
			lastModified: new Date("2026-09-02T00:00:00.000Z"),
			metadata: {},
		});
		await mediaAdoptJob(message);
		const second = mediaObjectRepository.insertMany.mock.calls[1]?.[0][0].id;

		expect(second).not.toBe(first);
	});

	it("removes the source and asks for the thumbnail once the row is in place", async () => {
		await mediaAdoptJob(message);

		expect(mediaStorageRepository.delete).toHaveBeenCalledWith("photos/山.MP4");
		expect(sqs.sendMessages).toHaveBeenCalledWith([
			expect.objectContaining({
				body: expect.objectContaining({
					objectKey: "_inbox/20260901-090000000.mp4",
				}),
			}),
		]);
	});
});
