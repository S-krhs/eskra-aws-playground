import { Writable } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";

const exists = vi.hoisted(() => {
	return vi.fn();
});
const createTable = vi.hoisted(() => {
	return vi.fn();
});
const createWriteStream = vi.hoisted(() => {
	return vi.fn();
});
const table = vi.hoisted(() => {
	return vi.fn(() => {
		return { exists, createWriteStream };
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

/** 実クライアントと同じ順序(complete → finish)でイベントを出す write stream。 */
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

	describe("ensureTable", () => {
		it("テーブルが無ければ定義どおりに作る", async () => {
			exists.mockResolvedValue([false]);
			createTable.mockResolvedValue([{}]);

			await createLoader().ensureTable();

			expect(createTable).toHaveBeenCalledWith("scraping_metrics", {
				schema: { fields: target.definition.fields },
				timePartitioning: { type: "DAY", field: "scraped_date" },
				clustering: { fields: ["data_source_id"] },
			});
		});

		it("テーブルがあれば作らない", async () => {
			exists.mockResolvedValue([true]);

			await createLoader().ensureTable();

			expect(createTable).not.toHaveBeenCalled();
		});

		it("並行実行で先に作られていた場合(409)は作成済みとして扱う", async () => {
			exists.mockResolvedValue([false]);
			createTable.mockRejectedValue(
				Object.assign(new Error("Already Exists"), { code: 409 }),
			);

			await expect(createLoader().ensureTable()).resolves.toBeUndefined();
		});

		it("409 以外の作成失敗はそのまま throw する", async () => {
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
		it("パーティション装飾子付きのテーブルへ NDJSON を WRITE_TRUNCATE で流す", async () => {
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

		it("load job が失敗したら throw する", async () => {
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

		it("行数を読み取れない場合は 0 として返す", async () => {
			createWriteStream.mockReturnValue(new FakeWriteStream({ metadata: {} }));

			const result = await createLoader().replacePartition({
				partitionDate: "2026-09-01",
				rows: toAsyncIterable([{ label: "作品A" }]),
			});

			expect(result).toEqual({ loadedRowCount: 0 });
		});
	});
});
