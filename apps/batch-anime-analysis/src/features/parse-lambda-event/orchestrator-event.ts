// In scope: orchestrator が受け取る起動イベントの中間表現の型と検証を提供する
// Out of scope: SQS 送受信、実行対象の決定、スクレイピング実行を行う
import type { LambdaEvent } from "../../shared/infra/lambda.js";

/** orchestrator が処理する起動スケジュール単位の実行要求。 */
export interface OrchestratorEvent {
	scheduleHour: number;
}

/** Lambda 起動イベントを orchestrator の実行入力として検証する。 */
export const parseOrchestratorEvent = (
	event: LambdaEvent,
): OrchestratorEvent => {
	const { scheduleHour } = event;
	if (typeof scheduleHour !== "number" || !Number.isFinite(scheduleHour)) {
		throw new Error(
			`起動イベントに有効な scheduleHour がありません: ${JSON.stringify(scheduleHour)}`,
		);
	}
	return { scheduleHour };
};
