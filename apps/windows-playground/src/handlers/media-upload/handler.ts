// In scope: the entry point — validating the arguments, dispatching each file to the job, and deciding the exit code
// Out of scope: how a file gets stored, key construction, the config file's format, converting the path
import { toWslPath } from "@eskra-aws-playground/libs/path/windows-path.js";
import { loadConfigFile } from "./config-file.js";
import { mediaUploadJob } from "./jobs/media-upload-job.js";

const toMessage = (error: unknown): string => {
	return error instanceof Error ? error.message : String(error);
};

// 1. Validate what SendTo handed over. One launch sees only part of a large selection.
const paths = process.argv.slice(2);

if (paths.length === 0) {
	console.error(
		"アップロードするファイルを引数で渡してください。エクスプローラーの「送る」から起動します。",
	);
	process.exit(1);
}

// 2. Load the config and put the connections where repositories reads them, before the first upload.
//    A startup failure prints no stack, only text the user can act on
const config = await loadConfigFile().catch((error: unknown) => {
	console.error(toMessage(error));
	process.exit(1);
});

process.env.R2_CREDENTIALS = JSON.stringify(config.r2);
process.env.MEDIA_BUCKET = config.bucket;

// 3. Dispatch one file at a time — in parallel, a run of large videos would eat bandwidth and memory.
//    One file's failure doesn't stop the rest
let uploaded = 0;
const failures: string[] = [];

for (const [index, path] of paths.entries()) {
	const progress = `[${index + 1}/${paths.length}]`;

	try {
		const media = await mediaUploadJob(toWslPath(path));

		uploaded += 1;
		console.log(`${progress} 保存しました: ${media.objectKey}`);
	} catch (error) {
		failures.push(path);
		console.error(`${progress} 失敗しました: ${path}`);
		console.error(`         ${toMessage(error)}`);
	}
}

// 4. Report the run, and let the failure count decide the exit code.
console.log(`\n${uploaded} 件を保存しました。`);

if (failures.length > 0) {
	console.error(`${failures.length} 件が失敗しました。`);
	process.exit(1);
}

console.log("管理ツールに出すには同期を実行してください。");
