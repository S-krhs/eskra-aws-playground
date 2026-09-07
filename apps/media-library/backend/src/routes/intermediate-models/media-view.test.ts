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
	// R2 の key は画面から使わないため、応答に載せない
	it("objectKey と thumbnailKey を落とし、サムネイルの有無だけを渡す", () => {
		const view = toMediaView(buildMedia({ thumbnailKey: "_thumb/x.webp" }));

		expect(view).not.toHaveProperty("objectKey");
		expect(view).not.toHaveProperty("thumbnailKey");
		expect(view.hasThumbnail).toBe(true);
	});

	it("サムネイル未生成は hasThumbnail を false にする", () => {
		expect(toMediaView(buildMedia()).hasThumbnail).toBe(false);
	});

	it("日時は ISO 文字列で返す", () => {
		expect(toMediaView(buildMedia()).uploadedAt).toBe(
			"2026-09-01T00:00:00.000Z",
		);
	});
});
