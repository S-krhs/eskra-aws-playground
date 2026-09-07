// In scope: 同期 Lambda を待たずに起動する
// Out of scope: 同期そのものの実行、実行記録の読み出し、設定ファイルの解決
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { mediaJobNames } from "@eskra-aws-playground/shared-domains/contracts/media-job-names.js";

/** 同期 Lambda の起動先。 */
export interface MediaSyncTarget {
	functionName: string;
	region: string;
}

/**
 * 同期 job を非同期で起動する。
 * 同期は分単位で掛かるため応答は待たず、進捗は MediaSyncRun を読んで確かめる。
 * 二重起動は同期 job 側が実行中の記録を見て弾くので、ここでは抑止しない。
 */
export const startMediaSync = async (
	target: MediaSyncTarget,
): Promise<void> => {
	const client = new LambdaClient({ region: target.region });

	await client.send(
		new InvokeCommand({
			FunctionName: target.functionName,
			InvocationType: "Event",
			Payload: Buffer.from(
				JSON.stringify({ job: mediaJobNames.mediaSync }),
				"utf8",
			),
		}),
	);
};
