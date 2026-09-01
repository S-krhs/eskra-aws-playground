// アニメ指標の BigQuery 連携 Lambda を、指定期間について月単位で invoke する。
// 1 回の invoke が Lambda の実行時間 (15 分) に収まるよう期間を分割し、
// 途中で失敗した場合は、どこまで終わったかを示して残りを再実行できるようにする。
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { appendFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const functionName = process.env.FUNCTION_NAME;
const dryRun = process.env.DRY_RUN === "true";

/** Date を YYYY-MM-DD へ変換する。 */
function toDateString(value) {
	return value.toISOString().slice(0, 10);
}

/** YYYY-MM-DD を UTC 00:00 の Date へ変換する。存在しない日付は受け付けない。 */
function parseDate(value, label) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "")) {
		throw new Error(`${label}が YYYY-MM-DD 形式ではありません: ${value}`);
	}

	// Date は 2026-02-30 のような存在しない日を繰り上げるため、往復させて一致を確かめる
	const date = new Date(`${value}T00:00:00.000Z`);
	if (Number.isNaN(date.getTime()) || toDateString(date) !== value) {
		throw new Error(`${label}が存在しない日付です: ${value}`);
	}

	return date;
}

/** 期間を暦月の区切りで分割する。両端を含む。 */
function buildMonthChunks(startDate, endDate) {
	const chunks = [];
	let cursor = startDate;

	while (cursor <= endDate) {
		const monthEnd = new Date(
			Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0),
		);
		chunks.push({
			startDate: toDateString(cursor),
			endDate: toDateString(monthEnd < endDate ? monthEnd : endDate),
		});
		cursor = new Date(
			Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1),
		);
	}

	return chunks;
}

/** 連携 Lambda が存在するか確認する。名前がずれている場合をここで止める。 */
function requireFunction() {
	try {
		execFileSync(
			"aws",
			["lambda", "get-function", "--function-name", functionName],
			{ stdio: "pipe" },
		);
	} catch (error) {
		throw new Error(
			`Lambda ${functionName} を参照できません。infra/sst.config.ts の name と deploy 済みの stage、` +
				`および IAM role の権限を確認してください: ${error.stderr?.toString().trim() ?? error.message}`,
		);
	}
}

/** 1 区間分を invoke し、Lambda のレスポンスを返す。 */
function invokeChunk(chunk) {
	const outputPath = join(tmpdir(), `backfill-${randomUUID()}.json`);

	try {
		const metadata = execFileSync(
			"aws",
			[
				"lambda",
				"invoke",
				"--function-name",
				functionName,
				"--invocation-type",
				"RequestResponse",
				"--payload",
				JSON.stringify(chunk),
				"--cli-binary-format",
				"raw-in-base64-out",
				// 既定の read timeout (60 秒) では 15 分の実行を待てない
				"--cli-read-timeout",
				"0",
				outputPath,
			],
			{ encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
		);

		const response = JSON.parse(readFileSync(outputPath, "utf8"));

		if (JSON.parse(metadata).FunctionError) {
			throw new Error(
				`Lambda が失敗しました: ${response.errorMessage ?? JSON.stringify(response)}`,
			);
		}

		return response;
	} finally {
		rmSync(outputPath, { force: true });
	}
}

/** GitHub Actions の Job Summary へ結果表を出力する。 */
function writeSummary(lines) {
	const summaryPath = process.env.GITHUB_STEP_SUMMARY;
	if (!summaryPath) {
		return;
	}

	appendFileSync(summaryPath, `${lines.join("\n")}\n`);
}

function main() {
	if (!functionName) {
		throw new Error("FUNCTION_NAME が設定されていません。");
	}

	const startDate = parseDate(process.env.START_DATE, "開始日");
	const endDate = parseDate(process.env.END_DATE, "終了日");

	if (endDate < startDate) {
		throw new Error(
			`終了日が開始日より前です: ${toDateString(startDate)} 〜 ${toDateString(endDate)}`,
		);
	}

	const chunks = buildMonthChunks(startDate, endDate);
	console.log(
		`${toDateString(startDate)} 〜 ${toDateString(endDate)} を ${chunks.length} 区間に分けて連携します。`,
	);

	if (dryRun) {
		for (const chunk of chunks) {
			console.log(`  (dry-run) ${chunk.startDate} 〜 ${chunk.endDate}`);
		}
		writeSummary([
			"## BigQuery 連携 (dry-run)",
			"",
			`対象: ${toDateString(startDate)} 〜 ${toDateString(endDate)}（${chunks.length} 区間）`,
		]);
		return;
	}

	requireFunction();

	const summaryRows = ["| 区間 | 取得日数 | 行数 |", "| --- | ---: | ---: |"];
	let totalDateCount = 0;
	let totalRowCount = 0;

	for (const [index, chunk] of chunks.entries()) {
		const position = `[${index + 1}/${chunks.length}]`;
		console.log(`${position} ${chunk.startDate} 〜 ${chunk.endDate} を連携中`);

		let response;
		try {
			response = invokeChunk(chunk);
		} catch (error) {
			// 済んだ区間は BigQuery 側に残るため、失敗した区間から再実行すればよい
			writeSummary([
				"## BigQuery 連携（失敗）",
				"",
				`${chunk.startDate} で失敗しました。この日から再実行してください。`,
				"",
				...summaryRows,
			]);
			throw error;
		}

		const details = response.details ?? {};
		totalDateCount += details.exportedDateCount ?? 0;
		totalRowCount += details.exportedRowCount ?? 0;
		summaryRows.push(
			`| ${chunk.startDate} 〜 ${chunk.endDate} | ${details.exportedDateCount ?? 0} | ${details.exportedRowCount ?? 0} |`,
		);
		console.log(
			`${position} 完了: 取得日 ${details.exportedDateCount ?? 0} 件 / ${details.exportedRowCount ?? 0} 行`,
		);
	}

	console.log(
		`連携が完了しました: 取得日 ${totalDateCount} 件 / ${totalRowCount} 行`,
	);
	writeSummary([
		"## BigQuery 連携",
		"",
		`対象: ${toDateString(startDate)} 〜 ${toDateString(endDate)}`,
		"",
		...summaryRows,
		`| **合計** | **${totalDateCount}** | **${totalRowCount}** |`,
	]);
}

try {
	main();
} catch (error) {
	console.error(error.message);
	process.exit(1);
}
