import type { MediaObject } from "@eskra-aws-playground/repositories/media/media-object/types.js";
import { describe, expect, it } from "vitest";
import { toMediaView } from "./media-view.js";

const buildMedia = (overrides: Partial<MediaObject> = {}): MediaObject => {
	return {
		id: "11111111-1111-4111-8111-111111111111",
		objectKey: "_inbox/20260901-000000000.png",
		logicalPath: "_inbox",
		fileName: "イラスト.png",
		contentType: "image/png",
		byteSize: 1024,
		etag: "etag-1",
		width: undefined,
		height: undefined,
		durationMs: undefined,
		thumbnailKey: undefined,
		uploadedAt: new Date("2026-09-01T00:00:00.000Z"),
		syncedAt: new Date("2026-09-07T00:00:00.000Z"),
		trashedAt: undefined,
		...overrides,
	};
};

describe("toMediaView", () => {
	// The screen never uses an R2 key, so none goes in the response
	it("drops objectKey and thumbnailKey, passing only whether a thumbnail exists", () => {
		const view = toMediaView(buildMedia({ thumbnailKey: "_thumb/x.webp" }));

		expect(view).not.toHaveProperty("objectKey");
		expect(view).not.toHaveProperty("thumbnailKey");
		expect(view.hasThumbnail).toBe(true);
	});

	it("reports hasThumbnail false while no thumbnail is generated", () => {
		expect(toMediaView(buildMedia()).hasThumbnail).toBe(false);
	});

	it("returns timestamps as ISO strings", () => {
		expect(toMediaView(buildMedia()).uploadedAt).toBe(
			"2026-09-01T00:00:00.000Z",
		);
	});
});
