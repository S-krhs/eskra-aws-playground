// In scope: JST 基準の現在日付の取得を提供する(時差の吸収はこのファイルに閉じる)
// Out of scope: 表示用フォーマット、日付演算、JST 以外のタイムゾーン
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);

// JST は夏時間がなく UTC+9 固定
const JST_UTC_OFFSET_MINUTES = 9 * 60;

/** JST 基準の現在日付を YYYY-MM-DD 形式で返す。 */
export const getCurrentJstDateString = (): string => {
	return dayjs().utcOffset(JST_UTC_OFFSET_MINUTES).format("YYYY-MM-DD");
};
