// vitest の JSON レポート (各パッケージの vitest-report.json) を集約し、
// GitHub Actions の Job Summary にパッケージ別のテスト結果表を出力する。
// レポートが 1 件も無い場合や集計に失敗した場合でも CI 自体は落とさない。
import { appendFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const ROOT = process.cwd();
const IGNORED_DIRS = new Set([
	"node_modules",
	".git",
	".turbo",
	".tmp",
	".sst",
	"dist",
	"coverage",
]);

/** vitest-report.json を再帰的に探す */
function findReports(dir, found = []) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			if (!IGNORED_DIRS.has(entry.name)) {
				findReports(join(dir, entry.name), found);
			}
		} else if (entry.name === "vitest-report.json") {
			found.push(join(dir, entry.name));
		}
	}
	return found;
}

/** レポートのあるディレクトリから npm パッケージ名を得る (無ければ相対パス) */
function packageName(reportPath) {
	const pkgDir = dirname(reportPath);
	const pkgJson = join(pkgDir, "package.json");
	if (existsSync(pkgJson)) {
		try {
			const { name } = JSON.parse(readFileSync(pkgJson, "utf8"));
			if (name) return name;
		} catch {
			// package.json が壊れていてもパス表示にフォールバック
		}
	}
	return relative(ROOT, pkgDir) || ".";
}

function formatDuration(ms) {
	if (!Number.isFinite(ms) || ms < 0) return "-";
	if (ms < 1000) return `${Math.round(ms)}ms`;
	return `${(ms / 1000).toFixed(1)}s`;
}

const reports = findReports(ROOT).sort();

const rows = [];
const failures = [];
const totals = { files: 0, tests: 0, passed: 0, failed: 0, ok: true };

for (const reportPath of reports) {
	let data;
	try {
		data = JSON.parse(readFileSync(reportPath, "utf8"));
	} catch {
		continue;
	}
	const name = packageName(reportPath);
	const files = data.testResults?.length ?? data.numTotalTestSuites ?? 0;
	const tests = data.numTotalTests ?? 0;
	const passed = data.numPassedTests ?? 0;
	const failed = data.numFailedTests ?? 0;
	const ok = data.success !== false && failed === 0;

	const starts = (data.testResults ?? [])
		.map((r) => {
			return r.startTime;
		})
		.filter(Boolean);
	const ends = (data.testResults ?? [])
		.map((r) => {
			return r.endTime;
		})
		.filter(Boolean);
	const duration =
		starts.length && ends.length
			? Math.max(...ends) - Math.min(...starts)
			: Number.NaN;

	rows.push({ name, files, tests, passed, failed, ok, duration });
	totals.files += files;
	totals.tests += tests;
	totals.passed += passed;
	totals.failed += failed;
	if (!ok) totals.ok = false;

	for (const file of data.testResults ?? []) {
		for (const a of file.assertionResults ?? []) {
			if (a.status === "failed") {
				failures.push({
					name,
					file: relative(ROOT, file.name),
					title: a.fullName || a.title,
					messages: a.failureMessages ?? [],
				});
			}
		}
	}
}

const lines = [];
lines.push("## 🧪 単体テスト結果", "");

if (rows.length === 0) {
	lines.push("> vitest-report.json が見つかりませんでした。");
} else {
	const overall = totals.ok ? "✅ すべて成功" : "❌ 失敗あり";
	lines.push(
		`**${overall}** — ${totals.passed}/${totals.tests} passed（${rows.length} packages / ${totals.files} files）`,
		"",
		"| Package | Files | Tests | ✅ | ❌ | Duration |",
		"| --- | --: | --: | --: | --: | --: |",
	);
	for (const r of rows) {
		const icon = r.ok ? "✅" : "❌";
		lines.push(
			`| ${icon} ${r.name} | ${r.files} | ${r.tests} | ${r.passed} | ${r.failed} | ${formatDuration(r.duration)} |`,
		);
	}
	lines.push(
		`| **合計** | **${totals.files}** | **${totals.tests}** | **${totals.passed}** | **${totals.failed}** | |`,
	);

	if (failures.length > 0) {
		lines.push("", "### ❌ 失敗したテスト", "");
		for (const f of failures) {
			lines.push(`- **${f.name}** › ${f.title}`, `  <br>\`${f.file}\``);
			const msg = (f.messages[0] ?? "")
				.split("\n")
				.slice(0, 6)
				.join("\n")
				.trim();
			if (msg)
				lines.push(
					"",
					"  ```",
					...msg.split("\n").map((l) => {
						return `  ${l}`;
					}),
					"  ```",
				);
		}
	}
}

const output = `${lines.join("\n")}\n`;
process.stdout.write(output);
if (process.env.GITHUB_STEP_SUMMARY) {
	appendFileSync(process.env.GITHUB_STEP_SUMMARY, output);
}
