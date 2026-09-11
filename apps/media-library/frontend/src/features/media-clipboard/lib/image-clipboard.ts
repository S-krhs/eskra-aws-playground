// In scope: putting one image on the browser's own clipboard, converting what the clipboard won't take
// Out of scope: fetching the listing, the file the backend puts on the Windows clipboard, rendering

// Chromium takes only PNG on the clipboard, so anything else is redrawn as one on the way
const CLIPBOARD_IMAGE_TYPE = "image/png";

const toPng = async (blob: Blob): Promise<Blob> => {
	const bitmap = await createImageBitmap(blob);

	try {
		const canvas = document.createElement("canvas");
		canvas.width = bitmap.width;
		canvas.height = bitmap.height;
		const context = canvas.getContext("2d");

		if (!context) {
			throw new Error("画像を変換できませんでした");
		}

		context.drawImage(bitmap, 0, 0);

		return await new Promise((resolve, reject) => {
			canvas.toBlob((converted) => {
				if (converted) {
					resolve(converted);
				} else {
					reject(new Error("画像を変換できませんでした"));
				}
			}, CLIPBOARD_IMAGE_TYPE);
		});
	} finally {
		bitmap.close();
	}
};

/**
 * Reads the original back from the backend and puts it on the clipboard as an image, so it pastes into
 * a document or a chat window as a picture. The page is served over loopback, which counts as a secure
 * context, so the clipboard is writable without HTTPS.
 */
export const writeImageToClipboard = async (url: string): Promise<void> => {
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error("原本を読み込めませんでした");
	}

	const blob = await response.blob();
	const image = blob.type === CLIPBOARD_IMAGE_TYPE ? blob : await toPng(blob);

	await navigator.clipboard.write([
		new ClipboardItem({ [CLIPBOARD_IMAGE_TYPE]: image }),
	]);
};
