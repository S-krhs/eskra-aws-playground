// In scope: UMA ワンドロお題通知を JST 12-18 時のどこか 1 時間だけ実行するための時刻判定を行う
// Out of scope: バッチジョブ本体の処理、cron スケジュールの定義を持つ

/** 実行候補とする JST の時刻範囲(両端を含む)。 */
const EXECUTION_HOUR_RANGE = { startHour: 12, endHour: 18 } as const;

const JST_TIME_ZONE = "Asia/Tokyo";

/** JST の日付キー(YYYY-MM-DD)と時。 */
export interface JstDateHour {
	dateKey: string;
	hour: number;
}

/** 指定した日時を JST の日付キーと時に変換する。 */
export const toJstDateHour = (now: Date): JstDateHour => {
	const formatter = new Intl.DateTimeFormat("en-CA", {
		timeZone: JST_TIME_ZONE,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		hourCycle: "h23",
	});
	const parts = formatter.formatToParts(now);
	const getPart = (type: string): string => {
		return (
			parts.find((part) => {
				return part.type === type;
			})?.value ?? ""
		);
	};

	return {
		dateKey: `${getPart("year")}-${getPart("month")}-${getPart("day")}`,
		hour: Number(getPart("hour")),
	};
};

/** 32bit 整数を拡散させ、近い入力からも大きく異なる値を作る (Murmur3 fmix32)。 */
const avalanche32 = (value: number): number => {
	let hash = value >>> 0;

	hash ^= hash >>> 16;
	hash = Math.imul(hash, 0x85ebca6b);
	hash ^= hash >>> 13;
	hash = Math.imul(hash, 0xc2b2ae35);
	hash ^= hash >>> 16;

	return hash >>> 0;
};

/** 日付キーから 0 以上 1 未満の疑似乱数を決定的に導く。 */
const hashDateKeyToUnitInterval = (dateKey: string): number => {
	let hash = 0;

	for (const char of dateKey) {
		hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
	}

	return avalanche32(hash) / 0x100000000;
};

/** JST の日付ごとに、実行候補の時刻範囲から実行する時を決定的に選ぶ。 */
export const resolveExecutionHour = (dateKey: string): number => {
	const { startHour, endHour } = EXECUTION_HOUR_RANGE;
	const candidateCount = endHour - startHour + 1;
	const offset = Math.floor(
		hashDateKeyToUnitInterval(dateKey) * candidateCount,
	);

	return startHour + offset;
};

/** 指定した日時が、その日の UMA ワンドロお題通知の実行対象時刻かどうかを判定する。 */
export const isUmaOneDrawTopicExecutionHour = (now: Date): boolean => {
	const { dateKey, hour } = toJstDateHour(now);

	return hour === resolveExecutionHour(dateKey);
};
