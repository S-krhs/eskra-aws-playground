// In scope: SendTo から渡されたファイルを順に R2 へ保存する CLI のエントリポイント
// Out of scope: 保存の実装、key の組み立て、設定ファイルの書式、DB への反映
import { createR2Client } from "@eskra-aws-playground/integration-r2/r2-client.js";
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

// 起動時の失敗はコンソールに stack を出さず、直せる文言だけを見せる
const settings = await loadUploadSettings().catch((error: unknown) => {
	console.error(toMessage(error));
	process.exit(1);
});
const client = createR2Client(settings.credentials);

let uploaded = 0;
const failures: string[] = [];

// 大きい動画が並ぶと帯域とメモリを食うため、並列化せず 1 件ずつ送る
for (const [index, path] of paths.entries()) {
	const progress = `[${index + 1}/${paths.length}]`;

	try {
		const media = await uploadMediaFile(client, {
			bucket: settings.bucket,
			filePath: toWslPath(path),
		});

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
