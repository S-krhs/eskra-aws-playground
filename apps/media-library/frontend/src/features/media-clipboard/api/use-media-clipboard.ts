// In scope: copying one media object to the clipboard, as an image or as a file, and how that went
// Out of scope: rendering, deciding which media is copied, the listing itself, the words shown for it
import { useMutation } from "@tanstack/react-query";
import {
	getGetMediaFileUrl,
	type Media,
	type MutationStatus,
	toMutationStatus,
	useCopyMediaToClipboard,
} from "@/shared/api";
import { writeImageToClipboard } from "../lib/image-clipboard.js";

/**
 * The two ways one media object goes onto the clipboard.
 * `status` is worth showing beside the buttons — the clipboard itself gives no sign of having taken
 * anything, and copying a large file as a file takes as long as downloading it.
 */
export interface MediaClipboard {
	copyImage: (media: Media) => void;
	copyFile: (media: Media) => void;
	status: MutationStatus;
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
	const imageStatus = toMutationStatus(image);

	return {
		copyImage: (media) => {
			// Each holds on to how it last went, so the other is dropped and only the copy being asked
			// for now is left to report
			file.reset();
			image.mutate(media);
		},
		copyFile: (media) => {
			image.reset();
			file.mutate({ id: media.id });
		},
		status: imageStatus.kind === "idle" ? toMutationStatus(file) : imageStatus,
	};
};
