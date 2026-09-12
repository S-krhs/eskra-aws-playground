// In scope: the MediaObject table's column shape as this package sees it
// Out of scope: converting a row to a public type, queries, the public MediaObject type

/** Mirrors the table so a query result can be typed without the generated client leaking out. */
export interface MediaObjectRow {
	id: string;
	objectKey: string;
	logicalPath: string;
	fileName: string;
	contentType: string;
	byteSize: bigint;
	etag: string;
	width: number | null;
	height: number | null;
	durationMs: number | null;
	thumbnailKey: string | null;
	uploadedAt: Date;
	syncedAt: Date;
	trashedAt: Date | null;
}

/** The same row read together with its tag links, for the queries that report what a media carries. */
export interface MediaObjectWithTagsRow extends MediaObjectRow {
	tags: { tag: { name: string } }[];
}
