// In scope: replacing a BigQuery date partition via a load job (including creating the target table)
// Out of scope: resolving where credentials come from, what a row means, which date to export
import { Readable } from "node:stream";
import { BigQuery, type Job, type TableField } from "@google-cloud/bigquery";
import type { BigQueryServiceAccountCredentials } from "./service-account-credentials.js";

export interface BigQueryTableDefinition {
	fields: TableField[];
	/** DATE column used for DAY partitioning. */
	partitionField: string;
	clusteringFields?: string[];
}

export interface BigQueryTableTarget {
	datasetId: string;
	tableId: string;
	definition: BigQueryTableDefinition;
}

export interface BigQueryPartitionLoadInput {
	/** DAY partition to replace, `YYYY-MM-DD`. */
	partitionDate: string;
	rows: AsyncIterable<Record<string, unknown>>;
}

export interface BigQueryPartitionLoadResult {
	/** As reported by BigQuery, not independently verified. */
	loadedRowCount: number;
}

interface LoadJobMetadata {
	statistics?: {
		load?: {
			outputRows?: string | number;
		};
	};
}

interface TableMetadata {
	timePartitioning?: {
		expirationMs?: string | number | null;
	};
}

const millisecondsPerDay = 86_400_000;

const isAlreadyExistsError = (error: unknown): boolean => {
	return (error as { code?: unknown } | null)?.code === 409;
};

/**
 * Errors out if the table has a partition expiration set. Past that
 * expiration, rows get deleted right after a successful load — silently
 * turning "load succeeded" into "no rows" — so this has to run before writing.
 */
const requireNoPartitionExpiration = (
	tableId: string,
	metadata: TableMetadata | undefined,
): void => {
	const expirationMs = Number(metadata?.timePartitioning?.expirationMs ?? 0);

	if (!Number.isFinite(expirationMs) || expirationMs <= 0) {
		return;
	}

	throw new Error(
		`${tableId} にパーティションの有効期限(${Math.floor(expirationMs / millisecondsPerDay)} 日)が設定されています。` +
			"これより古い取得日は書き込んでも削除されるため、連携を中止します。" +
			"dataset の default_partition_expiration_days とテーブルの partition_expiration_days を解除してください" +
			"(BigQuery サンドボックスでは解除できないため、課金の有効化が必要です)。",
	);
};

const toJsonLines = async function* (
	rows: AsyncIterable<Record<string, unknown>>,
): AsyncGenerator<string> {
	for await (const row of rows) {
		yield `${JSON.stringify(row)}\n`;
	}
};

const readLoadedRowCount = (job: Job): number => {
	const outputRows = (job.metadata as LoadJobMetadata | undefined)?.statistics
		?.load?.outputRows;
	const loadedRowCount = Number(outputRows);

	return Number.isFinite(loadedRowCount) ? loadedRowCount : 0;
};

/** Uses WRITE_TRUNCATE, so re-running with the same input doesn't change the result. */
export class BigQueryPartitionLoader {
	private readonly bigQuery: BigQuery;

	public constructor(
		credentials: BigQueryServiceAccountCredentials,
		private readonly target: BigQueryTableTarget,
	) {
		this.bigQuery = new BigQuery({
			projectId: credentials.projectId,
			credentials: {
				client_email: credentials.clientEmail,
				private_key: credentials.privateKey,
			},
		});
	}

	/** Creates the table from `definition` if missing, then checks it's writable. Assumes the dataset already exists. */
	public async ensureTable(): Promise<void> {
		const dataset = this.bigQuery.dataset(this.target.datasetId);
		const table = dataset.table(this.target.tableId);
		const [exists] = await table.exists();

		if (!exists) {
			const { definition } = this.target;
			try {
				await dataset.createTable(this.target.tableId, {
					schema: { fields: definition.fields },
					timePartitioning: {
						type: "DAY",
						field: definition.partitionField,
					},
					...(definition.clusteringFields
						? { clustering: { fields: definition.clusteringFields } }
						: {}),
				});
			} catch (error) {
				// A concurrent run may have created it first — treat that as success
				if (!isAlreadyExistsError(error)) {
					throw error;
				}
			}
		}

		// Also check right after creating: a new table can inherit the dataset's default expiration
		const [metadata] = await table.getMetadata();
		requireNoPartitionExpiration(this.target.tableId, metadata);
	}

	/** Replaces one DAY partition with `rows`. BigQuery fails the load job if a row's partition-column value doesn't match `partitionDate`. */
	public async replacePartition(
		input: BigQueryPartitionLoadInput,
	): Promise<BigQueryPartitionLoadResult> {
		const partitionSuffix = input.partitionDate.replaceAll("-", "");
		const partitionTable = this.bigQuery
			.dataset(this.target.datasetId)
			.table(`${this.target.tableId}$${partitionSuffix}`);

		const loadJob = await new Promise<Job>((resolve, reject) => {
			const writeStream = partitionTable.createWriteStream({
				sourceFormat: "NEWLINE_DELIMITED_JSON",
				writeDisposition: "WRITE_TRUNCATE",
				schema: { fields: this.target.definition.fields },
			});
			const source = Readable.from(toJsonLines(input.rows), {
				objectMode: false,
			});

			writeStream.on("complete", resolve);
			writeStream.on("error", reject);
			source.on("error", (error) => {
				writeStream.destroy(error);
			});
			source.pipe(writeStream);
		});

		return { loadedRowCount: readLoadedRowCount(loadJob) };
	}
}
