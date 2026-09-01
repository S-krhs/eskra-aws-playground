// In scope: BigQuery の日付パーティションを load job で置き換える(連携先テーブルの作成を含む)
// Out of scope: 認証情報の取得元解決、行の業務的な意味づけ、連携対象日の決定を行う
import { Readable } from "node:stream";
import { BigQuery, type Job, type TableField } from "@google-cloud/bigquery";
import type { BigQueryServiceAccountCredentials } from "./service-account-credentials.js";

/** 連携先テーブルの構造定義。日付パーティション列を必須にする。 */
export interface BigQueryTableDefinition {
	fields: TableField[];
	/** DAY パーティションに使う DATE 列名。 */
	partitionField: string;
	clusteringFields?: string[];
}

/** 連携先テーブルの所在と構造。 */
export interface BigQueryTableTarget {
	datasetId: string;
	tableId: string;
	definition: BigQueryTableDefinition;
}

/** パーティション 1 つ分の置き換え入力。 */
export interface BigQueryPartitionLoadInput {
	/** 置き換える DAY パーティション(YYYY-MM-DD)。 */
	partitionDate: string;
	rows: AsyncIterable<Record<string, unknown>>;
}

/** パーティション 1 つ分の置き換え結果。 */
export interface BigQueryPartitionLoadResult {
	/** BigQuery がパーティションへ書き込んだと報告した行数。 */
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

/** BigQuery が既存リソースとして拒否したかを判定する。 */
const isAlreadyExistsError = (error: unknown): boolean => {
	return (error as { code?: unknown } | null)?.code === 409;
};

/**
 * パーティションの有効期限が設定されていればエラーにする。
 * 期限より古い取得日は load job が成功したあとに削除され、
 * 「書き込みは成功したのに行が無い」状態になるため、書き込む前に止める。
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

/**
 * 日付パーティション単位で BigQuery のテーブルを置き換えるクライアント。
 * load job の WRITE_TRUNCATE を使うため、同じ入力での再実行は結果を変えない。
 */
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

	/**
	 * 連携先テーブルが無ければ定義どおりに作り、書き込める状態かを確かめる。
	 * dataset は事前に存在している必要がある。
	 */
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
				// 並行実行で先に作られていた場合は、作成済みとして扱う
				if (!isAlreadyExistsError(error)) {
					throw error;
				}
			}
		}

		// 作成時に dataset 既定の有効期限を継承することがあるため、作成直後も含めて確認する
		const [metadata] = await table.getMetadata();
		requireNoPartitionExpiration(this.target.tableId, metadata);
	}

	/**
	 * 指定日の DAY パーティションを rows の内容で置き換える。
	 * パーティション列の値が指定日と異なる行が含まれる場合、BigQuery 側が load job を失敗させる。
	 */
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
