// In scope: storing a thumbnail fetched from R2 locally and serving it from there afterwards
// Out of scope: generating a thumbnail, fetching it from R2, assembling the HTTP response
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

/** Only a mediaId already validated as a UUID may be passed — it becomes the file name verbatim. */
const toCachePath = (cacheDir: string, mediaId: string): string => {
	return join(cacheDir, `${mediaId}.webp`);
};

/** undefined when nothing is cached. */
export const readCachedThumbnail = async (
	cacheDir: string,
	mediaId: string,
): Promise<Buffer | undefined> => {
	try {
		return await readFile(toCachePath(cacheDir, mediaId));
	} catch {
		return undefined;
	}
};

/** Written under a temp name and renamed into place, so a request mid-write never reads a partial file. */
export const writeCachedThumbnail = async (
	cacheDir: string,
	mediaId: string,
	body: Uint8Array,
): Promise<void> => {
	await mkdir(cacheDir, { recursive: true });

	const destination = toCachePath(cacheDir, mediaId);
	const temporary = `${destination}.${process.pid}.tmp`;

	await writeFile(temporary, body);
	await rename(temporary, destination);
};
