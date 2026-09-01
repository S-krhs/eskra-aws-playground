// In scope: BigQuery 連携 Lambda 起動イベントの外部入力 schema と型を提供する
// Out of scope: 連携対象日の既定値の解決、metric の読み出し、BigQuery への書き込みを行う
import { z } from "zod";

/** BigQuery 連携 Lambda が受け取る起動イベント schema。日付は両端を含み、省略時は job 側で前日分に解決する。 */
export const bigQueryExportEventSchema = z.object({
	startDate: z.iso.date().optional(),
	endDate: z.iso.date().optional(),
});

/** BigQuery 連携 Lambda が受け取る起動イベント。 */
export type BigQueryExportEvent = z.infer<typeof bigQueryExportEventSchema>;
