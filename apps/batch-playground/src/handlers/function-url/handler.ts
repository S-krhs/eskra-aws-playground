// In scope: Function URL の公開エンドポイントとして envelope を検証し、リクエストパスから担当 route へ委譲する
// Out of scope: 署名検証、interaction 内容の解釈、応答 payload の中身を持つ
import { paths } from "./contracts/paths.js";
import { kaguyaBotInteractionRoute } from "./routes/kaguya-bot-interaction/route.js";
import { yacchoBotInteractionRoute } from "./routes/yaccho-bot-interaction/route.js";
import {
	type FunctionUrlEvent,
	type FunctionUrlResponse,
	functionUrlEventSchema,
} from "./schema.js";

/** Function URL のリクエストを受け取り HTTP response を返す route。 */
type FunctionUrlRoute = (
	event: FunctionUrlEvent,
) => Promise<FunctionUrlResponse>;

/** リクエストパスと担当 route の対応。route を追加したらここへ登録する(例: "/slack/events")。 */
const routesByPath = new Map<string, FunctionUrlRoute>([
	[paths.yacchoBotInteraction, yacchoBotInteractionRoute],
	[paths.kaguyaBotInteraction, kaguyaBotInteractionRoute],
]);

/** Lambda Function URL のエントリポイント。envelope を検証し、パスに対応する route へ委譲する。 */
export const handler = async (
	event: unknown = {},
): Promise<FunctionUrlResponse> => {
	const parsedEvent = functionUrlEventSchema.safeParse(event);

	if (!parsedEvent.success) {
		return {
			statusCode: 400,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ error: "リクエストの形式が不正です。" }),
		};
	}

	const route = routesByPath.get(parsedEvent.data.rawPath);

	if (!route) {
		return {
			statusCode: 404,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ error: "対応していないパスです。" }),
		};
	}

	return route(parsedEvent.data);
};
