// In scope: the CLI entry point storing the files SendTo hands over into R2, one after another
// Out of scope: the storing itself, key construction, the config file format, writing to the DB
import { uploadMediaFile } from "../features/media-upload/media-uploader.js";
import { toWslPath } from "../features/media-upload/windows-path.js";
import { loadUploadSettings } from "../shared/upload-settings.js";

const toMessage = (error: unknown): string => {
	return error instanceof Error ? error.message : String(error);
};

const paths = process.argv.slice(2);

if (paths.length === 0) {
	console.error(
		"アップロードするファイルを引数で渡してください。エクスプローラーの「送る」から起動します。",
	);
	process.exit(1);
}

// A startup failure prints no stack, only text the user can act on
const settings = await loadUploadSettings().catch((error: unknown) => {
	console.error(toMessage(error));
	process.exit(1);
});
// repositories contracts its connections as environment variables, so they are set before the first upload
process.env.R2_CREDENTIALS = settings.r2CredentialsJson;
process.env.MEDIA_BUCKET = settings.bucket;

let uploaded = 0;
const failures: string[] = [];

// Sent one at a time rather than in parallel, since a run of large videos would eat bandwidth and memory
for (const [index, path] of paths.entries()) {
	const progress = `[${index + 1}/${paths.length}]`;

	try {
		const media = await uploadMediaFile(toWslPath(path));

		uploaded += 1;
		console.log(`${progress} 保存しました: ${media.objectKey}`);
	} catch (error) {
		failures.push(path);
		console.error(`${progress} 失敗しました: ${path}`);
		console.error(`         ${toMessage(error)}`);
	}
}

console.log(`\n${uploaded} 件を保存しました。`);

if (failures.length > 0) {
	console.error(`${failures.length} 件が失敗しました。`);
	process.exit(1);
}

console.log("管理ツールに出すには同期を実行してください。");
