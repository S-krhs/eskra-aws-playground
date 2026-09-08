// In scope: the one place holding CloudWatch alarm description text
// Out of scope: alarm thresholds, metrics, and the rest of an alarm's configuration

/** Text used as a CloudWatch alarm's alarmDescription. */
export const alarmDescriptions = {
	animeAnalysisDlqDepth:
		"アニメ分析 worker が失敗し DLQ にメッセージが滞留しています",
	animeAnalysisOrchestratorError:
		"アニメ分析 orchestrator の実行が失敗しました",
	animeMetricBigQueryExportError: "アニメ指標の BigQuery 連携が失敗しました",
	mediaSyncError: "メディアライブラリの同期が失敗しました",
	mediaThumbnailDlqDepth:
		"サムネイル生成が失敗し DLQ にメッセージが滞留しています",
	mediaAdoptDlqDepth:
		"外部から置かれたメディアの取り込みが失敗し DLQ にメッセージが滞留しています",
	playgroundBatchError: "batch playground の実行が失敗しました",
	functionUrlError: "公開エンドポイント(Function URL)の実行が失敗しました",
	playgroundInteractionDlqDepth:
		"interaction の後追いジョブが失敗し DLQ にメッセージが滞留しています",
} as const;
