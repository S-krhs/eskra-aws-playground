// In scope: building an R2 key from a modified time and file name, and reading the logical path back out of a key
// Out of scope: the key's input shape, reading the modified time, detecting collisions, talking to R2, encoding metadata
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import type { MediaObjectKeyInput } from "./schema.js";

dayjs.extend(utc);

// JST has no DST, so it is a fixed UTC+9
const JST_UTC_OFFSET_MINUTES = 9 * 60;

const KEY_TIMESTAMP_FORMAT = "YYYYMMDD-HHmmssSSS";

/** Formats the modified time as the JST string a key uses: 2026-09-07T04:30:45.123Z becomes 20260907-133045123. */
export const formatKeyTimestamp = (modifiedAt: Date): string => {
	return dayjs(modifiedAt)
		.utcOffset(JST_UTC_OFFSET_MINUTES)
		.format(KEY_TIMESTAMP_FORMAT);
};

/** The extension is accepted with or without a leading "." and lowercased. */
export const buildMediaObjectKey = (input: MediaObjectKeyInput): string => {
	const extension = input.extension.replace(/^\./, "").toLowerCase();
	const suffix = input.sequence === undefined ? "" : `-${input.sequence}`;
	const fileName = `${formatKeyTimestamp(input.modifiedAt)}${suffix}`;

	return `${input.logicalPath}/${fileName}${extension ? `.${extension}` : ""}`;
};

/** A key with no directory part has no logical path, and returns an empty string. */
export const extractLogicalPath = (objectKey: string): string => {
	const separatorIndex = objectKey.lastIndexOf("/");

	return separatorIndex === -1 ? "" : objectKey.slice(0, separatorIndex);
};
