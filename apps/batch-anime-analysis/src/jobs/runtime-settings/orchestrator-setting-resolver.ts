// In scope: Orchestrator job が使う実行時設定の型と、SST link からの解決を提供する
// Out of scope: Lambda イベント解釈、外部サービス送信、ジョブ判定を行う
import { requireLinkedUrl } from "./require-linked-resource.js";

/** Orchestrator job が使う実行時設定。 */
export interface OrchestratorSettings {
	queueUrl: string;
}

/** Orchestrator job が使う実行時設定を解決する。 */
export const getOrchestratorSettings = (): OrchestratorSettings => {
	return {
		queueUrl: requireLinkedUrl("AnimeAnalysisQueue"),
	};
};
