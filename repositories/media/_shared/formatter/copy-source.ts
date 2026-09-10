// In scope: the CopySource value a copy between two keys of the media bucket takes
// Out of scope: sending the copy, building or reading a key, DB rows
/**
 * Builds the `CopySource` value for `CopyObjectCommand`.
 * Keeps a key's `/` as path separators and percent-encodes everything else —
 * needed because a non-ASCII folder name doesn't survive as-is.
 */
export const buildCopySource = (bucket: string, key: string): string => {
	const encodedKey = key
		.split("/")
		.map((segment) => {
			return encodeURIComponent(segment);
		})
		.join("/");

	return `${bucket}/${encodedKey}`;
};
