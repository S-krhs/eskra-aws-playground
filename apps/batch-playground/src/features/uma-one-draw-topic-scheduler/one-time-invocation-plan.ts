// In scope: UMA ワンドロお題通知を起動する one-time schedule の実行計画(名前・時刻)を決める
// Out of scope: Lambda イベント解釈、schedule の登録、起動対象 ARN の解決を行う
import { getCurrentJstDateString } from "@eskra-aws-playground/libs/date/current-jst-date.js";

import {
	INVOCATION_SCHEDULE_NAME_PREFIX,
	INVOCATION_TIMEZONE,
	INVOCATION_WINDOW_DURATION_MINUTES,
	INVOCATION_WINDOW_START_HOUR,
} from "./invocation-window-settings.js";

/** one-time schedule の実行計画。 */
export interface OneTimeInvocationPlan {
	/** 日付で一意にした schedule 名。発火前の同日二重登録は同名検知で防ぐ(発火後は自動削除で名前が解放され、防げない)。 */
	scheduleName: string;
	/** at() 式へ渡す timezone ローカルの起動時刻(YYYY-MM-DDTHH:mm:ss)。 */
	scheduleAt: string;
	/** scheduleAt を解釈する IANA タイムゾーン。 */
	timezone: string;
}

const padTwoDigits = (value: number): string => {
	return String(value).padStart(2, "0");
};

const MINUTE_IN_MS = 60_000;

/**
 * 当日 JST の起動 window からランダムに起動時刻を選び、実行計画を作る。
 * window 開始後の実行では過去時刻を選ばないよう「今+1分」以降から選び、
 * window 終了後はエラーにする。random は [0, 1) を返す関数。
 */
export const planOneTimeInvocation = (
	random: () => number = Math.random,
): OneTimeInvocationPlan => {
	const date = getCurrentJstDateString();
	// JST は夏時間がなく UTC+9 固定のため、固定オフセットで window 開始を epoch に変換する
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
