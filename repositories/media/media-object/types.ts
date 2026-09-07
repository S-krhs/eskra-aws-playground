// In scope: MediaObject repository の入出力型
// Out of scope: validation schema、DB 操作、key の組み立て、サムネイル生成

/** 管理対象の 1 メディア。 */
export interface MediaObject {
	id: string;
	objectKey: string;
	logicalPath: string;
	fileName: string;
	contentType: string;
	byteSize: number;
	etag: string;
	width: number | undefined;
	height: number | undefined;
	durationMs: number | undefined;
	thumbnailKey: string | undefined;
	uploadedAt: Date;
	syncedAt: Date;
	trashedAt: Date | undefined;
}

/**
 * 同期が R2 の一覧と突き合わせるための軽量な射影。
 * etag は同じ key のまま中身が差し替わった場合を見つけるために持つ。
 */
export interface MediaObjectSummary {
	id: string;
	objectKey: string;
	etag: string;
}

/** 同期が新規に登録する 1 件。 */
export interface InsertMediaObjectInput {
	id: string;
	objectKey: string;
	logicalPath: string;
	fileName: string;
	contentType: string;
	byteSize: number;
	etag: string;
	uploadedAt: Date;
	syncedAt: Date;
}

/**
 * 同じ key のまま差し替わった 1 件の作り直し。
 * サムネイルと寸法は作り直しになるため、この更新で消える。
 */
export interface RefreshMediaObjectInput {
	id: string;
	byteSize: number;
	etag: string;
	uploadedAt: Date;
	syncedAt: Date;
}

/** 外部で移動された 1 件の key の付け替え。 */
export interface RelocateMediaObjectInput {
	id: string;
	objectKey: string;
	logicalPath: string;
	syncedAt: Date;
}

/** サムネイルが未生成のメディア。生成 job へ渡す最小の情報。 */
export interface ThumbnaillessMediaObject {
	id: string;
	objectKey: string;
}

/** サムネイル未生成のメディアを探す条件。 */
export interface FindThumbnaillessInput {
	limit: number;
	/** 生成をこの回数まで試行し、それでも作れなければ対象から除外する。 */
	maxAttempts: number;
	/** この時刻より前に投入したものだけを再投入の対象にする。処理中のメッセージを重複して投入しないための境界。 */
	retryBefore: Date;
}

/** サムネイル生成の結果。寸法と尺は読めた分だけ渡す。 */
export interface SetMediaThumbnailInput {
	id: string;
	thumbnailKey: string;
	width?: number;
	height?: number;
	durationMs?: number;
}

/** 一覧の位置。前ページ最後の 1 件を指す。 */
export interface MediaObjectCursor {
	uploadedAt: Date;
	id: string;
}

/** 一覧の取得条件。ゴミ箱に入れたものは常に除外される。 */
export interface FindMediaObjectPageInput {
	logicalPath?: string;
	contentTypePrefix?: string;
	limit: number;
	cursor?: MediaObjectCursor;
}

/** 一覧の 1 ページ。nextCursor が undefined なら最後のページ。 */
export interface MediaObjectPage {
	objects: MediaObject[];
	nextCursor: MediaObjectCursor | undefined;
}
