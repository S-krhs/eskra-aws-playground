// In scope: getting yesterday's date in JST
// Out of scope: display formatting, arithmetic for arbitrary day offsets, JST offset math (current-jst-date.ts)
import dayjs from "dayjs";
import { getCurrentJstDateString } from "./current-jst-date.js";

/** `YYYY-MM-DD`. */
export const getPreviousJstDateString = (): string => {
	return dayjs(getCurrentJstDateString())
		.subtract(1, "day")
		.format("YYYY-MM-DD");
};
