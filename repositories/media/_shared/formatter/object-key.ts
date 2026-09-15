// In scope: the key an object takes in the media bucket, and reading an area, a logical path or being archived back out of one
// Out of scope: what the areas are, talking to storage, DB rows, what object metadata means, thumbnail generation
import { getJstDateTimeParts } from "@eskra-aws-playground/libs/date/jst-date-time-parts.js";
import {
	AREA_PREFIXES,
	type MediaStorageArea,
	type NamedMediaStorageArea,
} from "../literals/storage-area.js";

const THUMBNAIL_EXTENSION = "webp";

/** For narrowing a query to an area without building a key. */
export const buildAreaKeyPrefix = (area: NamedMediaStorageArea): string => {
	return `${AREA_PREFIXES[area]}/`;
};

/** Anything outside the named areas reads as "other" — media filed into a folder by hand lands there. */
export const resolveArea = (key: string): MediaStorageArea => {
	for (const [area, prefix] of Object.entries(AREA_PREFIXES)) {
		if (key.startsWith(`${prefix}/`)) {
			return area as NamedMediaStorageArea;
		}
	}

	return "other";
};

/**
 * An archived object put in the trash carries the archive's prefix along under the trash's, and that is
 * taken off too — it says where a restore goes, not a folder.
 */
const splitArea = (
	key: string,
): { area: MediaStorageArea; isArchived: boolean; path: string } => {
	const area = resolveArea(key);

	if (area === "other") {
		return { area, isArchived: false, path: key };
	}

	const path = key.slice(buildAreaKeyPrefix(area).length);
	const archivePrefix = buildAreaKeyPrefix("archive");

	if (area === "archive") {
		return { area, isArchived: true, path };
	}

	return area === "deleted" && path.startsWith(archivePrefix)
		? { area, isArchived: true, path: path.slice(archivePrefix.length) }
		: { area, isArchived: false, path };
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

/**
 * The key an object keeps its file name at when it moves between areas.
 * `logicalPath` puts it under that path inside the area, so an object moved out of a folder reads back
 * with the folder it came from — which is how it finds its way home again. An archived object going into
 * the trash also keeps the archive's prefix, so its way home leads back into the archive.
 */
export const buildAreaKeyKeepingName = (input: {
	area: NamedMediaStorageArea;
	key: string;
	logicalPath?: string;
}): string => {
	const fileName = input.key.slice(input.key.lastIndexOf("/") + 1);
	const archive =
		input.area === "deleted" && splitArea(input.key).isArchived
			? buildAreaKeyPrefix("archive")
			: "";
	const path = input.logicalPath ? `${input.logicalPath}/` : "";

	return `${AREA_PREFIXES[input.area]}/${archive}${path}${fileName}`;
};

/**
 * The key an object takes once it is filed into a folder, keeping the name it already has.
 * The logical path sits at the top of the bucket rather than under an area's prefix: the named areas
 * are this package's own staging ground, and a filed object has left them. An archived one is the
 * exception, kept under the archive's prefix so it stays apart from the library.
 */
export const buildLogicalPathKey = (input: {
	key: string;
	logicalPath: string;
	isArchived: boolean;
}): string => {
	const fileName = input.key.slice(input.key.lastIndexOf("/") + 1);
	const archive = input.isArchived ? buildAreaKeyPrefix("archive") : "";
	const path = input.logicalPath ? `${input.logicalPath}/` : "";

	return `${archive}${path}${fileName}`;
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
	const { path } = splitArea(key);
	const separatorIndex = path.lastIndexOf("/");

	return separatorIndex === -1 ? "" : path.slice(0, separatorIndex);
};

/** Whether a key sits in the archive, or in the trash after being taken out of it. */
export const isArchivedKey = (key: string): boolean => {
	return splitArea(key).isArchived;
};
