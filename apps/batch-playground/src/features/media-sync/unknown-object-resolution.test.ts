import { describe, expect, it } from "vitest";
import { decideUnknownObject } from "./unknown-object-resolution.js";

const mediaId = "018f3a2c-6b41-7c9d-9f02-1a5e8c3d7b40";

const known = (ids: {
	knownIds?: string[];
	missingIds?: string[];
}): { knownIds: Set<string>; missingIds: Set<string> } => {
	return {
		knownIds: new Set(ids.knownIds ?? []),
		missingIds: new Set(ids.missingIds ?? []),
	};
};

describe("decideUnknownObject", () => {
	// 元の key が消えていて同じ media-id が別の key に現れたら移動
	it("元の key が消えていれば移動として扱う", () => {
		expect(
			decideUnknownObject(
				{ mediaId, originalName: "a.png" },
				known({ knownIds: [mediaId], missingIds: [mediaId] }),
			),
		).toEqual({ kind: "relocate", mediaId });
	});

	// metadata ごと複製されると同じ media-id が 2 つの key に載る。
	// 移動として扱うと objectKey が実行のたびに入れ替わり続ける
	it("元の key が残っていれば複製として扱う", () => {
		expect(
			decideUnknownObject(
				{ mediaId, originalName: "a.png" },
				known({ knownIds: [mediaId] }),
			),
		).toEqual({ kind: "duplicate", mediaId });
	});

	it("未登録の UUID なら新規として扱う", () => {
		expect(
			decideUnknownObject({ mediaId, originalName: "a.png" }, known({})),
		).toEqual({ kind: "insert", mediaId, originalName: "a.png" });
	});

	// R2 のダッシュボードや rclone から直接置かれたものは metadata を持たない
	it("metadata が無ければ取り込みとして扱う", () => {
		expect(
			decideUnknownObject(undefined, known({ knownIds: [mediaId] })),
		).toEqual({ kind: "adopt" });
	});
});
