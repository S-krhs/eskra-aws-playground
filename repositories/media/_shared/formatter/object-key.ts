// In scope: the key an object takes in the media bucket, and reading an area or logical path back out of one
// Out of scope: what the areas are, talking to storage, DB rows, what object metadata means, thumbnail generation
import { getJstDateTimeParts } from "@eskra-aws-playground/libs/date/jst-date-time-parts.js";
import {
	AREA_PREFIXES,
	type MediaStorageArea,
	type NamedMediaStorageArea,
} from "../literals/storage-area.js";

const THUMBNAIL_EXTENSION = "webp";

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
	const { year, month, day, hour, minute, second, millisecond } =
		getJstDateTimeParts(modifiedAt);

	return `${year}${month}${day}-${hour}${minute}${second}${millisecond}`;
};

/**
 * The key an object takes in an area, named after when it was last modified. No id goes into it —
 * that lives in the object's own metadata.
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

/**
 * Where an object sits, with the area taken off: an area's prefix is this package's own layout, and
 * travels on the returned area instead of inside a path a caller could read or rebuild a key from.
 * A key left with no directory part has no logical path, and returns an empty string.
 */
export const extractLogicalPath = (key: string): string => {
	const area = resolveArea(key);
	const path =
		area === "other" ? key : key.slice(AREA_PREFIXES[area].length + 1);
	const separatorIndex = path.lastIndexOf("/");

	return separatorIndex === -1 ? "" : path.slice(0, separatorIndex);
};
