// In scope: putting a media object in the trash or taking it back out, and refreshing what shows it
// Out of scope: rendering, deciding which media is acted on, fetching the listing, the words shown for it
import { useQueryClient } from "@tanstack/react-query";
import {
	getListMediaQueryKey,
	getListTagsQueryKey,
	type MutationStatus,
	toMutationStatus,
	useRestoreMedia,
	useTrashMedia,
} from "@/shared/api";

export interface MediaTrash {
	trash: (mediaId: string) => void;
	restore: (mediaId: string) => void;
	status: MutationStatus;
}

export const useMediaTrash = (): MediaTrash => {
	const queryClient = useQueryClient();
	// Both sides of the trash are listed under this key's prefix, so one invalidation covers whichever
	// of them is open, along with every filter already fetched under it. The tag counts follow the side
	// being counted, so they go the same way
	const refresh = async () => {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: getListMediaQueryKey() }),
			queryClient.invalidateQueries({ queryKey: getListTagsQueryKey() }),
		]);
	};
	const trash = useTrashMedia({ mutation: { onSuccess: refresh } });
	const restore = useRestoreMedia({ mutation: { onSuccess: refresh } });
	const trashStatus = toMutationStatus(trash);

	return {
		trash: (mediaId) => {
			// Each holds on to how it last went, so the other is dropped and only the move being asked
			// for now is left to report
			restore.reset();
			trash.mutate({ id: mediaId });
		},
		restore: (mediaId) => {
			trash.reset();
			restore.mutate({ id: mediaId });
		},
		status:
			trashStatus.kind === "idle" ? toMutationStatus(restore) : trashStatus,
	};
};
