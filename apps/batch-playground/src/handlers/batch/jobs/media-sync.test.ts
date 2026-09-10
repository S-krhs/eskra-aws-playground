import { beforeEach, describe, expect, it, vi } from "vitest";
import { mediaSyncJob } from "./media-sync.js";

const mediaObjectRepository = vi.hoisted(() => {
	return {
		findAllSummaries: vi.fn(),
		findAllWithoutThumbnail: vi.fn(),
		insertMany: vi.fn(),
		relocateMany: vi.fn(),
		refreshMany: vi.fn(),
		touchMany: vi.fn(),
		deleteByIds: vi.fn(),
	};
});
const mediaStorageRepository = vi.hoisted(() => {
	return {
		listAll: vi.fn(),
		headIfExists: vi.fn(),
		deleteThumbnail: vi.fn(),
		resolveArea: vi.fn(),
	};
});
const mediaSyncRunRepository = vi.hoisted(() => {
	return {
		insert: vi.fn(),
		findUnfinished: vi.fn(),
		updateCounts: vi.fn(),
		updateFinished: vi.fn(),
	};
});
const sqs = vi.hoisted(() => {
	return { constructor: vi.fn(), sendMessages: vi.fn() };
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
vi.mock(
	"@eskra-aws-playground/repositories/media/media-sync-run/repository.js",
	() => {
		return { mediaSyncRunRepository };
	},
);
vi.mock("@eskra-aws-playground/integration-sqs/sqs-message-sender.js", () => {
	return {
		SqsMessageSender: class {
			constructor(url: string) {
				sqs.constructor(url);
			}

			public sendMessages = sqs.sendMessages;
		},
	};
});
vi.mock("sst/resource", () => {
	return {
		Resource: {
			MediaThumbnailQueue: { url: "thumbnail-queue" },
			MediaAdoptQueue: { url: "adopt-queue" },
		},
	};
});

// parseMediaObjectMetadata treats a media-id that is not a UUID as absent, so fixtures use real ones
const scannedObject = (key: string, etag: string) => {
	return {
		key,
		area: key.startsWith("_pending/") ? "pending" : "inbox",
		logicalPath: "",
		byteSize: 1,
		etag,
		lastModified: new Date("2026-09-01T00:00:00.000Z"),
	};
};

const sentThumbnailIds = (): string[] => {
	const call = sqs.sendMessages.mock.calls.find(() => {
		return sqs.constructor.mock.calls.some(([url]) => {
			return url === "thumbnail-queue";
		});
	});

	return (call?.[0] ?? []).map((message: { id: string }) => {
		return message.id;
	});
};

beforeEach(() => {
	vi.clearAllMocks();
	mediaSyncRunRepository.insert.mockResolvedValue(true);
	mediaSyncRunRepository.updateCounts.mockResolvedValue(undefined);
	mediaSyncRunRepository.updateFinished.mockResolvedValue(undefined);
	mediaObjectRepository.findAllSummaries.mockResolvedValue([]);
	mediaObjectRepository.findAllWithoutThumbnail.mockResolvedValue([]);
	mediaObjectRepository.insertMany.mockResolvedValue(0);
	mediaObjectRepository.relocateMany.mockResolvedValue(0);
	mediaObjectRepository.refreshMany.mockResolvedValue(0);
	mediaObjectRepository.touchMany.mockResolvedValue(0);
	mediaObjectRepository.deleteByIds.mockResolvedValue(0);
	mediaStorageRepository.listAll.mockResolvedValue([]);
	mediaStorageRepository.headIfExists.mockResolvedValue(undefined);
	mediaStorageRepository.deleteThumbnail.mockResolvedValue(undefined);
	mediaStorageRepository.resolveArea.mockImplementation((key: string) => {
		return key.startsWith("_failed/") ? "failed" : "inbox";
	});
	sqs.sendMessages.mockResolvedValue(undefined);
});

describe("mediaSyncJob", () => {
	it("asks for a thumbnail for every scanned row that has none recorded", async () => {
		mediaStorageRepository.listAll.mockResolvedValue([
			scannedObject("_inbox/a.png", "e1"),
			scannedObject("_failed/c.png", "e3"),
		]);
		mediaObjectRepository.findAllSummaries.mockResolvedValue([
			{
				id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
				objectKey: "_inbox/a.png",
				etag: "e1",
			},
			{
				id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
				objectKey: "_failed/c.png",
				etag: "e3",
			},
		]);
		// The row whose key left the bucket is not asked for, and the failed area is terminal
		mediaObjectRepository.findAllWithoutThumbnail.mockResolvedValue([
			{ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", objectKey: "_inbox/a.png" },
			{
				id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
				objectKey: "_inbox/gone.png",
			},
			{
				id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
				objectKey: "_failed/c.png",
			},
		]);

		await mediaSyncJob({});

		expect(sentThumbnailIds()).toEqual([
			"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
		]);
	});

	it("keeps a second key claiming the same media id out of the relocations", async () => {
		mediaStorageRepository.listAll.mockResolvedValue([
			scannedObject("_inbox/copy-1.png", "e1"),
			scannedObject("_inbox/copy-2.png", "e1"),
		]);
		mediaObjectRepository.findAllSummaries.mockResolvedValue([
			{
				id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
				objectKey: "_inbox/old.png",
				etag: "e1",
			},
		]);
		mediaStorageRepository.headIfExists.mockResolvedValue({
			contentType: "image/png",
			byteSize: 1,
			etag: "e1",
			lastModified: new Date("2026-09-01T00:00:00.000Z"),
			metadata: {
				"media-id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
				"original-name": "a.png",
			},
		});

		const response = await mediaSyncJob({});

		const relocated = mediaObjectRepository.relocateMany.mock.calls.flatMap(
			(call) => {
				return call[0] as { id: string }[];
			},
		);
		expect(relocated).toHaveLength(1);
		expect(response.details).toMatchObject({ skippedCount: 1 });
	});

	it("keeps resolving after a HeadObject fails and holds the delete back", async () => {
		mediaStorageRepository.listAll.mockResolvedValue([
			scannedObject("_inbox/new-1.png", "e1"),
			scannedObject("_inbox/new-2.png", "e2"),
		]);
		mediaObjectRepository.findAllSummaries.mockResolvedValue([
			{
				id: "99999999-9999-4999-8999-999999999999",
				objectKey: "_inbox/vanished.png",
				etag: "e9",
			},
		]);
		mediaStorageRepository.headIfExists.mockImplementation((key: string) => {
			if (key === "_inbox/new-1.png") {
				return Promise.reject(new Error("SlowDown"));
			}

			return Promise.resolve({
				contentType: "image/png",
				byteSize: 1,
				etag: "e2",
				lastModified: new Date("2026-09-01T00:00:00.000Z"),
				metadata: {
					"media-id": "22222222-2222-4222-8222-222222222222",
					"original-name": "b.png",
				},
			});
		});

		const response = await mediaSyncJob({});

		const inserted = mediaObjectRepository.insertMany.mock.calls.flatMap(
			(call) => {
				return call[0] as { id: string }[];
			},
		);
		expect(
			inserted.map(({ id }) => {
				return id;
			}),
		).toEqual(["22222222-2222-4222-8222-222222222222"]);
		expect(mediaObjectRepository.deleteByIds).toHaveBeenCalledWith([]);
		expect(response.details).toMatchObject({ headFailureCount: 1 });
	});

	it("errors on an empty listing while rows remain", async () => {
		mediaObjectRepository.findAllSummaries.mockResolvedValue([
			{
				id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
				objectKey: "_inbox/a.png",
				etag: "e1",
			},
		]);

		await expect(mediaSyncJob({})).rejects.toThrow("R2 の一覧が空でした");
	});

	it("lets allowBulkDelete through an empty listing", async () => {
		mediaObjectRepository.findAllSummaries.mockResolvedValue([
			{
				id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
				objectKey: "_inbox/a.png",
				etag: "e1",
			},
		]);

		await expect(
			mediaSyncJob({ allowBulkDelete: true }),
		).resolves.toMatchObject({ ok: true });
		expect(mediaObjectRepository.deleteByIds).toHaveBeenCalledWith([
			"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
		]);
	});

	it("rejects a launch event whose allowBulkDelete is not a boolean", async () => {
		await expect(mediaSyncJob({ allowBulkDelete: "yes" })).rejects.toThrow(
			"allowBulkDelete は真偽値で指定してください。",
		);
	});

	it("stands down while another run holds the slot", async () => {
		mediaSyncRunRepository.insert.mockResolvedValue(false);
		mediaSyncRunRepository.findUnfinished.mockResolvedValue({
			id: "running-id",
			startedAt: new Date(),
			scannedCount: 0,
			insertedCount: 0,
			updatedCount: 0,
			deletedCount: 0,
		});

		await expect(mediaSyncJob({})).resolves.toMatchObject({
			details: { skipped: true, runningId: "running-id" },
		});
		expect(mediaStorageRepository.listAll).not.toHaveBeenCalled();
	});

	it("keeps the cause when releasing the run slot also fails", async () => {
		mediaStorageRepository.listAll.mockRejectedValue(new Error("listing 断"));
		mediaSyncRunRepository.updateFinished.mockRejectedValue(new Error("DB 断"));

		await expect(mediaSyncJob({})).rejects.toThrow("listing 断");
	});
});
