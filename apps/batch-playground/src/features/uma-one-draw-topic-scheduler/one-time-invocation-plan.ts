// In scope: deciding the name and time of the one-time schedule that fires the UMA one-draw topic notification
// Out of scope: interpreting the Lambda event, registering the schedule, resolving the target ARN
import { getCurrentJstDateString } from "@eskra-aws-playground/libs/date/current-jst-date.js";

import {
	INVOCATION_SCHEDULE_NAME_PREFIX,
	INVOCATION_TIMEZONE,
	INVOCATION_WINDOW_DURATION_MINUTES,
	INVOCATION_WINDOW_START_HOUR,
} from "./invocation-window-settings.js";

export interface OneTimeInvocationPlan {
	/** Schedule name made unique by the date. A same-day double registration before firing is caught by
	 * the name clash; after firing the schedule auto-deletes and frees the name, so it isn't. */
	scheduleName: string;
	/** Firing time in the timezone's local clock, handed to the at() expression (YYYY-MM-DDTHH:mm:ss). */
	scheduleAt: string;
	/** IANA timezone scheduleAt is read in. */
	timezone: string;
}

const padTwoDigits = (value: number): string => {
	return String(value).padStart(2, "0");
};

const MINUTE_IN_MS = 60_000;

/**
 * Picks a random firing time inside that day's JST window and builds the plan. Run after the window
 * opens, it picks from now+1 minute onward so it never lands in the past; run after the window closes,
 * it errors. `random` returns a value in [0, 1).
 */
export const planOneTimeInvocation = (
	random: () => number = Math.random,
): OneTimeInvocationPlan => {
	const date = getCurrentJstDateString();
	// JST has no DST and is a fixed UTC+9, so the window's opening converts to epoch on a fixed offset
	const windowStartEpochMs = Date.parse(
		`${date}T${padTwoDigits(INVOCATION_WINDOW_START_HOUR)}:00:00+09:00`,
	);
	const minOffsetMinutes = Math.max(
		0,
		Math.ceil((Date.now() + MINUTE_IN_MS - windowStartEpochMs) / MINUTE_IN_MS),
	);

	if (minOffsetMinutes >= INVOCATION_WINDOW_DURATION_MINUTES) {
		throw new Error(
			"当日の起動 window を過ぎているため schedule を登録できません。",
		);
	}

	const offsetMinutes =
		minOffsetMinutes +
		Math.floor(
			random() * (INVOCATION_WINDOW_DURATION_MINUTES - minOffsetMinutes),
		);
	const hour = INVOCATION_WINDOW_START_HOUR + Math.floor(offsetMinutes / 60);
	const minute = offsetMinutes % 60;

	return {
		scheduleName: `${INVOCATION_SCHEDULE_NAME_PREFIX}-${date}`,
		scheduleAt: `${date}T${padTwoDigits(hour)}:${padTwoDigits(minute)}:00`,
		timezone: INVOCATION_TIMEZONE,
	};
};
