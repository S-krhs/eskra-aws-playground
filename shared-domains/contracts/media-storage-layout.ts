// In scope: R2 上のメディアの置き場所と object metadata の語彙
// Out of scope: key の組み立て、metadata の符号化、R2 への通信

/** アップロードしたメディアの置き場。整理前のメディアは全てここに置く。 */
export const INBOX_PREFIX = "_inbox";

/** サムネイルの置き場。論理パスを含めず、移動時に触らなくてよいようにする。 */
export const THUMBNAIL_PREFIX = "_thumb";

/** メディアの同一性を表す UUID を持つ metadata のキー。 */
export const MEDIA_ID_METADATA_KEY = "media-id";

/** アップロード元のファイル名を持つ metadata のキー。 */
export const ORIGINAL_NAME_METADATA_KEY = "original-name";

/** R2 の object metadata に載せるメディアの素性。 */
export interface MediaObjectMetadata {
	mediaId: string;
	originalName: string;
}
