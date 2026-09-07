// In scope: 取り込む対象の拡張子と、そこから決まる content-type の語彙
// Out of scope: ファイルの中身の判定、key の組み立て、R2 への通信

// 取り込む対象を明示的に絞る。ここに無い拡張子はメディアとして扱わない
const CONTENT_TYPES: Record<string, string> = {
	avi: "video/x-msvideo",
	avif: "image/avif",
	bmp: "image/bmp",
	gif: "image/gif",
	jpeg: "image/jpeg",
	jpg: "image/jpeg",
	mkv: "video/x-matroska",
	mov: "video/quicktime",
	mp4: "video/mp4",
	png: "image/png",
	webm: "video/webm",
	webp: "image/webp",
};

/**
 * 拡張子から content-type を返す。
 * 対象外の拡張子は undefined を返し、呼び出し側でそのファイルを飛ばす。
 */
export const resolveContentType = (extension: string): string | undefined => {
	return CONTENT_TYPES[extension.replace(/^\./, "").toLowerCase()];
};
