import { describe, expect, it } from "vitest";
import { decideUnknownObject } from "./unknown-object-resolution.js";

const mediaId = "018f3a2c-6b41-7c9d-9f02-1a5e8c3d7b40";

describe("decideUnknownObject", () => {
	// アプリ経由で入ったものは metadata に UUID を持つ
	it("登録済みの UUID なら移動として扱う", () => {
		expect(
			decideUnknownObject(
				{ mediaId, originalName: "a.png" },
				new Set([mediaId]),
			),
		).toEqual({ kind: "relocate", mediaId });
	});

	it("未登録の UUID なら新規として扱う", () => {
		expect(
			decideUnknownObject({ mediaId, originalName: "a.png" }, new Set()),
		).toEqual({ kind: "insert", mediaId, originalName: "a.png" });
	});

	// R2 のダッシュボードや rclone から直接置かれたものは metadata を持たない
	it("metadata が無ければ取り込みとして扱う", () => {
		expect(decideUnknownObject(undefined, new Set([mediaId]))).toEqual({
			kind: "adopt",
		});
	});
});
