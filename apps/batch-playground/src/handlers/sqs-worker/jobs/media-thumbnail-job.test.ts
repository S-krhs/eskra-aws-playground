import { mediaJobNames } from "@eskra-aws-playground/shared-domains/media/jobs/names.js";
import type { MediaThumbnailMessage } from "@eskra-aws-playground/shared-domains/media/jobs/thumbnail-message.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mediaThumbnailJob } from "./media-thumbnail-job.js";

const ffmpeg = vi.hoisted(() => {
	return { probeMedia: vi.fn(), generateThumbnail: vi.fn() };
});
const mediaObjectRepository = vi.hoisted(() => {
	return { updateThumbnail: vi.fn(), relocateMany: vi.fn() };
});
const mediaStorageRepository = vi.hoisted(() => {
	return {
		headIfExists: vi.fn(),
		get: vi.fn(),
		uploadThumbnail: vi.fn(),
		deleteThumbnail: vi.fn(),
		moveIntoArea: vi.fn(),
		resolveArea: vi.fn(),
	};
});

vi.mock("@eskra-aws-playground/libs-media/ffmpeg/media-probe.js", () => {
	return { probeMedia: ffmpeg.probeMedia };
});
vi.mock(
	"@eskra-aws-playground/libs-media/ffmpeg/thumbnail-generator.js",
	() => {
		return {
			generateThumbnail: ffmpeg.generateThumbnail,
			resolvePosterSeconds: (durationMs: number | undefined) => {
				return durationMs !== undefined && durationMs < 2_000 ? 0 : 1;
			},
		};
	},
);
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

const mediaId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const pendingVideo: MediaThumbnailMessage = {
	job: mediaJobNames.mediaThumbnail,
	mediaId,
	objectKey: "_pending/20260901-090000000.mp4",
};

beforeEach(() => {
	vi.clearAllMocks();
	mediaStorageRepository.headIfExists.mockResolvedValue({
		contentType: "video/mp4",
		byteSize: 1,
		etag: "e1",
		lastModified: new Date(),
		metadata: {},
	});
	mediaStorageRepository.get.mockResolvedValue({ body: new Uint8Array([1]) });
	mediaStorageRepository.uploadThumbnail.mockResolvedValue(undefined);
	mediaStorageRepository.deleteThumbnail.mockResolvedValue(undefined);
	mediaStorageRepository.moveIntoArea.mockResolvedValue({
		key: "_inbox/20260901-090000000.mp4",
		logicalPath: "",
		byteSize: 1,
		etag: "e1",
	});
	mediaStorageRepository.resolveArea.mockImplementation((key: string) => {
		return key.startsWith("_pending/") ? "pending" : "inbox";
	});
	ffmpeg.probeMedia.mockResolvedValue({
		width: 1,
		height: 1,
		durationMs: 5_000,
	});
	ffmpeg.generateThumbnail.mockResolvedValue(Buffer.from("webp"));
	mediaObjectRepository.updateThumbnail.mockResolvedValue(1);
	mediaObjectRepository.relocateMany.mockResolvedValue(1);
});

describe("mediaThumbnailJob", () => {
	it("stops when a redelivery finds the object already moved on", async () => {
		mediaStorageRepository.headIfExists.mockResolvedValue(undefined);

		await mediaThumbnailJob(pendingVideo, 1);

		expect(mediaStorageRepository.get).not.toHaveBeenCalled();
		expect(mediaObjectRepository.updateThumbnail).not.toHaveBeenCalled();
	});

	it("seeks into a video for its poster frame", async () => {
		await mediaThumbnailJob(pendingVideo, 1);

		expect(ffmpeg.generateThumbnail).toHaveBeenCalledWith(
			expect.objectContaining({ seekSeconds: 1 }),
		);
	});

	it("takes an image's only frame without seeking", async () => {
		ffmpeg.probeMedia.mockResolvedValue({
			width: 1,
			height: 1,
			durationMs: undefined,
		});

		await mediaThumbnailJob(
			{ ...pendingVideo, objectKey: "_pending/a.png" },
			1,
		);

		expect(ffmpeg.generateThumbnail).toHaveBeenCalledWith(
			expect.objectContaining({ seekSeconds: 0 }),
		);
	});

	it("moves media waiting under the pending prefix on once it has a thumbnail", async () => {
		await mediaThumbnailJob(pendingVideo, 1);

		expect(mediaStorageRepository.moveIntoArea).toHaveBeenCalledWith({
			key: pendingVideo.objectKey,
			area: "inbox",
		});
		expect(mediaObjectRepository.updateThumbnail).toHaveBeenCalledWith(
			expect.objectContaining({
				location: expect.objectContaining({
					objectKey: "_inbox/20260901-090000000.mp4",
				}),
			}),
		);
	});

	it("leaves media already filed into a folder where it is", async () => {
		await mediaThumbnailJob({ ...pendingVideo, objectKey: "photos/a.mp4" }, 1);

		expect(mediaStorageRepository.moveIntoArea).not.toHaveBeenCalled();
		expect(mediaObjectRepository.updateThumbnail).toHaveBeenCalledWith(
			expect.objectContaining({ location: undefined }),
		);
	});

	it("removes the thumbnail when the row went away mid-generation", async () => {
		mediaObjectRepository.updateThumbnail.mockResolvedValue(0);

		await mediaThumbnailJob(pendingVideo, 1);

		expect(mediaStorageRepository.deleteThumbnail).toHaveBeenCalledWith(
			mediaId,
		);
	});

	it("moves the media aside on the last delivery so later syncs stop asking", async () => {
		ffmpeg.generateThumbnail.mockRejectedValue(new Error("壊れた動画"));
		mediaStorageRepository.moveIntoArea.mockResolvedValue({
			key: "_failed/20260901-090000000.mp4",
			logicalPath: "",
			byteSize: 1,
			etag: "e1",
		});

		await expect(mediaThumbnailJob(pendingVideo, 3)).rejects.toThrow(
			"壊れた動画",
		);
		expect(mediaStorageRepository.moveIntoArea).toHaveBeenCalledWith({
			key: pendingVideo.objectKey,
			area: "failed",
		});
	});

	it("leaves the media in place while deliveries remain", async () => {
		ffmpeg.generateThumbnail.mockRejectedValue(new Error("一時的な失敗"));

		await expect(mediaThumbnailJob(pendingVideo, 1)).rejects.toThrow(
			"一時的な失敗",
		);
		expect(mediaStorageRepository.moveIntoArea).not.toHaveBeenCalled();
	});
});
