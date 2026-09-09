// In scope: the media bucket's layout — the prefix each area sits under, the key an object gets there, and reading an area or logical path back out of a key
// Out of scope: talking to storage, DB rows, what object metadata means, thumbnail generation
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import type { MediaStorageArea, NamedMediaStorageArea } from "../types.js";

dayjs.extend(utc);

// JST has no DST, so it is a fixed UTC+9
const JST_UTC_OFFSET_MINUTES = 9 * 60;

const KEY_TIMESTAMP_FORMAT = "YYYYMMDD-HHmmssSSS";

const THUMBNAIL_EXTENSION = "webp";

/** The prefix each area is laid out under. This never leaves the package — an app names the area instead. */
const AREA_PREFIXES = {
	pending: "_pending",
	inbox: "_inbox",
	failed: "_failed",
	thumbnail: "_thumb",
} as const satisfies Record<NamedMediaStorageArea, string>;

/** Anything outside the named areas reads as "other" — media filed into a folder by hand lands there. */
export const resolveArea = (key: string): MediaStorageArea => {
	for (const [area, prefix] of Object.entries(AREA_PREFIXES)) {
		if (key.startsWith(`${prefix}/`)) {
			return area as NamedMediaStorageArea;
		}
	}

	return "other";
};

/** Formats the modified time as the JST string a key uses: 2026-09-07T04:30:45.123Z becomes 20260907-133045123. */
const formatKeyTimestamp = (modifiedAt: Date): string => {
	return dayjs(modifiedAt)
		.utcOffset(JST_UTC_OFFSET_MINUTES)
		.format(KEY_TIMESTAMP_FORMAT);
};

/**
 * The key an object takes in an area, named after when it was last modified.
 * `sequence` is the counter appended when two files land on the same timestamp, and the extension is
 * accepted with or without a leading "." and lowercased.
 */
export const buildAreaObjectKey = (input: {
	area: NamedMediaStorageArea;
	modifiedAt: Date;
	extension: string;
	sequence?: number;
}): string => {
	const extension = input.extension.replace(/^\./, "").toLowerCase();
	const suffix = input.sequence === undefined ? "" : `-${input.sequence}`;
	const fileName = `${formatKeyTimestamp(input.modifiedAt)}${suffix}`;

	return `${AREA_PREFIXES[input.area]}/${fileName}${extension ? `.${extension}` : ""}`;
};

/** The key an object keeps its file name at when it moves between areas. */
export const buildAreaKeyKeepingName = (input: {
	area: NamedMediaStorageArea;
	key: string;
}): string => {
	const fileName = input.key.slice(input.key.lastIndexOf("/") + 1);

	return `${AREA_PREFIXES[input.area]}/${fileName}`;
};

/** A thumbnail is named after the media's id alone, so moving the media never has to touch it. */
export const buildThumbnailKey = (mediaId: string): string => {
	return `${AREA_PREFIXES.thumbnail}/${mediaId}.${THUMBNAIL_EXTENSION}`;
};

/** A key with no directory part has no logical path, and returns an empty string. */
export const extractLogicalPath = (key: string): string => {
	const separatorIndex = key.lastIndexOf("/");

	return separatorIndex === -1 ? "" : key.slice(0, separatorIndex);
};
