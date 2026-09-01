// In scope: JST 基準の前日の日付の取得を提供する
// Out of scope: 表示用フォーマット、任意日数の日付演算、時差の吸収(current-jst-date.ts が担う)
import dayjs from "dayjs";
import { getCurrentJstDateString } from "./current-jst-date.js";

/** JST 基準の前日の日付を YYYY-MM-DD 形式で返す。 */
export const getPreviousJstDateString = (): string => {
	return dayjs(getCurrentJstDateString())
		.subtract(1, "day")
		.format("YYYY-MM-DD");
};
