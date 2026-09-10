// In scope: deciding the date range to export from the dates given on the launch event
// Out of scope: checking whether a date holds any metric, validating the launch event, writing to BigQuery
import { getPreviousJstDateString } from "@eskra-aws-playground/libs/date/previous-jst-date.js";

/** The requested date range; either end may be omitted. */
export interface ExportRangeInput {
	startDate?: string;
	endDate?: string;
}

/** The date range to export; inclusive at both ends. */
export interface ExportRange {
	startDate: string;
	endDate: string;
}

/**
 * One end alone means that single day; both omitted means the previous JST day.
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
