// In scope: getting today's date in JST (the offset math is contained to this file)
// Out of scope: display formatting, date arithmetic, timezones other than JST
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);

// JST has no DST, so a fixed UTC+9 offset is always correct
const JST_UTC_OFFSET_MINUTES = 9 * 60;

/** `YYYY-MM-DD`. */
export const getCurrentJstDateString = (): string => {
	return dayjs().utcOffset(JST_UTC_OFFSET_MINUTES).format("YYYY-MM-DD");
};
