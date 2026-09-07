import { describe, expect, it } from "vitest";
import {
	buildMediaObjectMetadata,
	parseMediaObjectMetadata,
} from "./media-object-metadata.js";

const mediaId = "018f3a2c-6b41-7c9d-9f02-1a5e8c3d7b40";

describe("buildMediaObjectMetadata", () => {
	// Metadata rides an HTTP header, where only ASCII survives
	it("percent-encodes a Japanese file name", () => {
		expect(
			buildMediaObjectMetadata({ mediaId, originalName: "イラスト.png" }),
		).toEqual({
			"media-id": mediaId,
			"original-name": "%E3%82%A4%E3%83%A9%E3%82%B9%E3%83%88.png",
		});
	});
});

describe("parseMediaObjectMetadata", () => {
	it("reads built metadata back", () => {
		const originalName = "イラスト 01.png";

		expect(
			parseMediaObjectMetadata(
				buildMediaObjectMetadata({ mediaId, originalName }),
			),
		).toEqual({ mediaId, originalName });
	});

	// An object placed from outside this app carries no metadata
	it("returns undefined without a media-id", () => {
		expect(parseMediaObjectMetadata({})).toBeUndefined();
		expect(parseMediaObjectMetadata(undefined)).toBeUndefined();
	});

	// Anyone can write metadata, and this value enters the primary key, so drop what doesn't read as a UUID
	it("treats a media-id that is not a UUID as absent", () => {
		expect(
			parseMediaObjectMetadata({ "media-id": "not-a-uuid" }),
		).toBeUndefined();
	});

	it("falls back to an empty string when there is no file name", () => {
		expect(parseMediaObjectMetadata({ "media-id": mediaId })).toEqual({
			mediaId,
			originalName: "",
		});
	});

	// A hand-placed value that fails to decode must not stop the import
	it("returns a value that was never percent-encoded as-is", () => {
		expect(
			parseMediaObjectMetadata({
				"media-id": mediaId,
				"original-name": "100%.png",
			}),
		).toEqual({ mediaId, originalName: "100%.png" });
	});
});
