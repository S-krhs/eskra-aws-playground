// In scope: copying one media object to the clipboard, as an image or as a file, and how that went
// Out of scope: rendering, deciding which media is copied, the listing itself
import { useMutation } from "@tanstack/react-query";
import {
	getGetMediaFileUrl,
	type Media,
	toMutationFailure,
	useCopyMediaToClipboard,
} from "@/shared/api";
import { writeImageToClipboard } from "../lib/image-clipboard.js";

/**
 * The two ways one media object goes onto the clipboard.
 * `message` is what to show beside the buttons — the clipboard itself gives no sign of having taken
 * anything, and copying a large file as a file takes as long as downloading it.
 */
export interface MediaClipboard {
	copyImage: (media: Media) => void;
	copyFile: (media: Media) => void;
	message: string | undefined;
}

export const useMediaClipboard = (): MediaClipboard => {
	// The image goes through the browser's own clipboard, which takes a picture rather than a file
	const image = useMutation({
		mutationFn: async (media: Media) => {
			await writeImageToClipboard(getGetMediaFileUrl(media.id));
		},
	});
	// The file goes through the backend, which writes it where Windows can reach it and calls Set-Clipboard
	const file = useCopyMediaToClipboard();
	const failure = toMutationFailure(file, 204) ?? toMutationFailure(image, 200);

	return {
		copyImage: (media) => {
			image.mutate(media);
		},
		copyFile: (media) => {
			file.mutate({ id: media.id });
		},
		message:
			image.isPending || file.isPending
				? "コピーしています…"
				: (failure ??
					(image.isSuccess || file.data?.status === 204
						? "コピーしました"
						: undefined)),
	};
};
