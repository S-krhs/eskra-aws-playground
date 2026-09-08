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
	// The original key gone and the same media-id on another key means a move
	it("treats a gone original key as a move", () => {
		expect(
			decideUnknownObject(
				{ mediaId, originalName: "a.png" },
				known({ knownIds: [mediaId], missingIds: [mediaId] }),
			),
		).toEqual({ kind: "relocate", mediaId });
	});

	// A copy carries the metadata along, putting the same media-id on two keys.
	// Treating that as a move flips objectKey between them on every run
	it("treats a surviving original key as a copy", () => {
		expect(
			decideUnknownObject(
				{ mediaId, originalName: "a.png" },
				known({ knownIds: [mediaId] }),
			),
		).toEqual({ kind: "duplicate", mediaId });
	});

	it("treats an unregistered UUID as new", () => {
		expect(
			decideUnknownObject({ mediaId, originalName: "a.png" }, known({})),
		).toEqual({ kind: "insert", mediaId, originalName: "a.png" });
	});

	// Anything placed straight from the R2 dashboard or rclone carries no metadata
	it("treats a missing metadata as an adoption", () => {
		expect(
			decideUnknownObject(undefined, known({ knownIds: [mediaId] })),
		).toEqual({ kind: "adopt" });
	});
});
