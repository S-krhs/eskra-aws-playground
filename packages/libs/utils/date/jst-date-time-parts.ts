// In scope: splitting a Date into the JST wall-clock parts a caller assembles its own format from
// Out of scope: choosing a format, date arithmetic, timezones other than JST
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);

// JST has no DST, so a fixed UTC+9 offset is always correct
const JST_UTC_OFFSET_MINUTES = 9 * 60;

/** Each part is zero-padded to the width it takes in a formatted string. */
export interface JstDateTimeParts {
	year: string;
	month: string;
	day: string;
	hour: string;
	minute: string;
	second: string;
	millisecond: string;
}

export const getJstDateTimeParts = (date: Date): JstDateTimeParts => {
	const jst = dayjs(date).utcOffset(JST_UTC_OFFSET_MINUTES);

	return {
		year: jst.format("YYYY"),
		month: jst.format("MM"),
		day: jst.format("DD"),
		hour: jst.format("HH"),
		minute: jst.format("mm"),
		second: jst.format("ss"),
		millisecond: jst.format("SSS"),
	};
};
