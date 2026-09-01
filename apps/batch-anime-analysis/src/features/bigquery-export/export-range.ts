// In scope: 起動イベントの日付指定から BigQuery 連携対象の日付範囲を決める
// Out of scope: 対象日に metric があるかの判定、起動イベントの検証、BigQuery への書き込みを行う
import { getPreviousJstDateString } from "@eskra-aws-playground/libs/date/previous-jst-date.js";

/** 連携対象の日付範囲の指定。どちらも省略できる。 */
export interface ExportRangeInput {
	startDate?: string;
	endDate?: string;
}

/** 連携対象の日付範囲。両端を含む。 */
export interface ExportRange {
	startDate: string;
	endDate: string;
}

/**
 * 日付指定から連携対象の日付範囲を決める。
 * 片方だけの指定はその 1 日、どちらも省略した場合は JST の前日 1 日分にする。
 */
export const resolveExportRange = (input: ExportRangeInput): ExportRange => {
	const defaultDate = getPreviousJstDateString();
	const startDate = input.startDate ?? input.endDate ?? defaultDate;
	const endDate = input.endDate ?? input.startDate ?? defaultDate;

	if (endDate < startDate) {
		throw new Error(
			`連携対象の終了日が開始日より前です: ${startDate} 〜 ${endDate}`,
		);
	}

	return { startDate, endDate };
};
