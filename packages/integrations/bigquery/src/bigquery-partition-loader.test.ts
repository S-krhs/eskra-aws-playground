import { Writable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const exists = vi.hoisted(() => {
	return vi.fn();
});
const createTable = vi.hoisted(() => {
	return vi.fn();
});
const createWriteStream = vi.hoisted(() => {
	return vi.fn();
});
const getMetadata = vi.hoisted(() => {
	return vi.fn();
});
const table = vi.hoisted(() => {
	return vi.fn(() => {
		return { exists, createWriteStream, getMetadata };
	});
});

vi.mock("@google-cloud/bigquery", () => {
	return {
		BigQuery: class {
			dataset = vi.fn(() => {
				return { table, createTable };
			});
		},
	};
});

import {
	BigQueryPartitionLoader,
	type BigQueryTableTarget,
} from "./bigquery-partition-loader.js";

/**
 * Emits events in the same order as the real client (complete → finish).
 * The real stream is duplexify — this doesn't reproduce its cork/uncork or job-driven destroy.
 */
class FakeWriteStream extends Writable {
	public readonly chunks: string[] = [];

	public constructor(
		private readonly job: unknown,
		private readonly failure?: Error,
	) {
		super();
	}

	public override _write(
		chunk: Buffer,
		_encoding: string,
		callback: (error?: Error) => void,
	): void {
		this.chunks.push(chunk.toString());
		callback();
	}

	public override _final(callback: (error?: Error) => void): void {
		if (this.failure) {
			callback(this.failure);
			return;
		}
		this.emit("complete", this.job);
		callback();
	}
}

const credentials = {
	projectId: "example-project",
	clientEmail: "exporter@example-project.iam.gserviceaccount.com",
	privateKey: "private-key",
};

const target: BigQueryTableTarget = {
	datasetId: "anime_analysis",
	tableId: "scraping_metrics",
	definition: {
		fields: [
			{ name: "label", type: "STRING", mode: "REQUIRED" },
			{ name: "scraped_date", type: "DATE", mode: "REQUIRED" },
		],
		partitionField: "scraped_date",
		clusteringFields: ["data_source_id"],
	},
};

const createLoader = () => {
	return new BigQueryPartitionLoader(credentials, target);
};

const toAsyncIterable = async function* (rows: Record<string, unknown>[]) {
	for (const row of rows) {
		yield row;
	}
};

describe("BigQueryPartitionLoader", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	beforeEach(() => {
		// Default: no expiration. Individual tests override this.
		getMetadata.mockResolvedValue([{ timePartitioning: { type: "DAY" } }]);
	});

	describe("ensureTable", () => {
		it("creates the table from the definition when it doesn't exist", async () => {
			exists.mockResolvedValue([false]);
			createTable.mockResolvedValue([{}]);

			await createLoader().ensureTable();

			expect(createTable).toHaveBeenCalledWith("scraping_metrics", {
				schema: { fields: target.definition.fields },
				timePartitioning: { type: "DAY", field: "scraped_date" },
				clustering: { fields: ["data_source_id"] },
			});
		});

		it("doesn't create the table when it already exists", async () => {
			exists.mockResolvedValue([true]);

			await createLoader().ensureTable();

			expect(createTable).not.toHaveBeenCalled();
		});

		it("treats a 409 (created concurrently) as already created", async () => {
			exists.mockResolvedValue([false]);
			createTable.mockRejectedValue(
				Object.assign(new Error("Already Exists"), { code: 409 }),
			);

			await expect(createLoader().ensureTable()).resolves.toBeUndefined();
		});

		it("aborts the export when a partition expiration is set", async () => {
			exists.mockResolvedValue([true]);
			getMetadata.mockResolvedValue([
				{ timePartitioning: { type: "DAY", expirationMs: "5184000000" } },
			]);

			await expect(createLoader().ensureTable()).rejects.toThrow(
				"パーティションの有効期限(60 日)",
			);
		});

		it("also catches an expiration inherited right after creation", async () => {
			exists.mockResolvedValue([false]);
			createTable.mockResolvedValue([{}]);
			getMetadata.mockResolvedValue([
				{ timePartitioning: { type: "DAY", expirationMs: "5184000000" } },
			]);

			await expect(createLoader().ensureTable()).rejects.toThrow(
				"パーティションの有効期限",
			);
		});

		it("rethrows a creation failure that isn't a 409", async () => {
			exists.mockResolvedValue([false]);
			createTable.mockRejectedValue(
				Object.assign(new Error("Permission denied"), { code: 403 }),
			);

			await expect(createLoader().ensureTable()).rejects.toThrow(
				"Permission denied",
			);
		});
	});

	describe("replacePartition", () => {
		it("streams NDJSON with WRITE_TRUNCATE to the partition-decorated table", async () => {
			const writeStream = new FakeWriteStream({
				metadata: { statistics: { load: { outputRows: "2" } } },
			});
			createWriteStream.mockReturnValue(writeStream);

			const result = await createLoader().replacePartition({
				partitionDate: "2026-09-01",
				rows: toAsyncIterable([
					{ label: "作品A", scraped_date: "2026-09-01" },
					{ label: "作品B", scraped_date: "2026-09-01" },
				]),
			});

			expect(table).toHaveBeenCalledWith("scraping_metrics$20260901");
			expect(createWriteStream).toHaveBeenCalledWith({
				sourceFormat: "NEWLINE_DELIMITED_JSON",
				writeDisposition: "WRITE_TRUNCATE",
				schema: { fields: target.definition.fields },
			});
			expect(writeStream.chunks.join("")).toBe(
				'{"label":"作品A","scraped_date":"2026-09-01"}\n{"label":"作品B","scraped_date":"2026-09-01"}\n',
			);
			expect(result).toEqual({ loadedRowCount: 2 });
		});

		it("throws when the load job fails", async () => {
			createWriteStream.mockReturnValue(
				new FakeWriteStream({}, new Error("load job が失敗しました")),
			);

			await expect(
				createLoader().replacePartition({
					partitionDate: "2026-09-01",
					rows: toAsyncIterable([{ label: "作品A" }]),
				}),
			).rejects.toThrow("load job が失敗しました");
		});

		it("throws when reading rows fails partway through", async () => {
			const writeStream = new FakeWriteStream({});
			createWriteStream.mockReturnValue(writeStream);

			const failingRows = async function* (): AsyncGenerator<
				Record<string, unknown>
			> {
				yield { label: "作品A" };
				throw new Error("DB の読み出しに失敗しました");
			};

			await expect(
				createLoader().replacePartition({
					partitionDate: "2026-09-01",
					rows: failingRows(),
				}),
			).rejects.toThrow("DB の読み出しに失敗しました");
		});

		it("replaces the partition even with zero rows", async () => {
			const writeStream = new FakeWriteStream({
				metadata: { statistics: { load: { outputRows: "0" } } },
			});
			createWriteStream.mockReturnValue(writeStream);

			const result = await createLoader().replacePartition({
				partitionDate: "2026-09-01",
				rows: toAsyncIterable([]),
			});

			expect(createWriteStream).toHaveBeenCalledTimes(1);
			expect(writeStream.chunks).toEqual([]);
			expect(result).toEqual({ loadedRowCount: 0 });
		});

		it("returns 0 when the row count can't be read", async () => {
			createWriteStream.mockReturnValue(new FakeWriteStream({ metadata: {} }));

			const result = await createLoader().replacePartition({
				partitionDate: "2026-09-01",
				rows: toAsyncIterable([{ label: "作品A" }]),
			});

			expect(result).toEqual({ loadedRowCount: 0 });
		});
	});
});
