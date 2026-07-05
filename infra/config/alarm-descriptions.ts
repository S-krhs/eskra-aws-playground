// In scope: CloudWatch alarm の説明文言を一元管理する
// Out of scope: alarm の閾値やメトリクスなどの構成定義

/** CloudWatch alarm の alarmDescription に使う文言。 */
export const alarmDescriptions = {
	animeAnalysisDlqDepth:
		"アニメ分析 worker が失敗し DLQ にメッセージが滞留しています",
	animeAnalysisOrchestratorError:
		"アニメ分析 orchestrator の実行が失敗しました",
} as const;
