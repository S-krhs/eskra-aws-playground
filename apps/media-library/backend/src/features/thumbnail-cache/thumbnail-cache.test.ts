import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	readCachedThumbnail,
	writeCachedThumbnail,
} from "./thumbnail-cache.js";

const mediaId = "11111111-1111-4111-8111-111111111111";
let cacheDir: string;

beforeEach(async () => {
	cacheDir = await mkdtemp(join(tmpdir(), "media-thumbnail-cache-"));
});

afterEach(async () => {
	await rm(cacheDir, { recursive: true, force: true });
});

describe("thumbnailCache", () => {
	it("reads back exactly what was stored", async () => {
		await writeCachedThumbnail(cacheDir, mediaId, new Uint8Array([1, 2, 3]));

		const cached = await readCachedThumbnail(cacheDir, mediaId);
		expect(cached && [...cached]).toEqual([1, 2, 3]);
	});

	// Nothing is cached on the first request; throwing here would block the refetch from R2
	it("returns undefined for an id that was never stored", async () => {
		expect(await readCachedThumbnail(cacheDir, mediaId)).toBeUndefined();
	});

	it("creates the cache directory when it is missing", async () => {
		const nested = join(cacheDir, "a", "b");
		await writeCachedThumbnail(nested, mediaId, new Uint8Array([1]));

		expect(await readdir(nested)).toEqual([`${mediaId}.webp`]);
	});

	// Written under a temp name and renamed into place, so a request mid-write never reads a partial file
	it("leaves no temp file behind after a write", async () => {
		await writeCachedThumbnail(cacheDir, mediaId, new Uint8Array([1]));

		expect(await readdir(cacheDir)).toEqual([`${mediaId}.webp`]);
	});
});
