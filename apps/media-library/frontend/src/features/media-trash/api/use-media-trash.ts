// In scope: putting a media object in the trash or taking it back out, and refreshing what shows it
// Out of scope: rendering, deciding which media is acted on, fetching the listing
import { useQueryClient } from "@tanstack/react-query";
import {
	getListMediaQueryKey,
	toMutationFailure,
	useRestoreMedia,
	useTrashMedia,
} from "@/shared/api";

/** The two moves the screen can make on one media object, and what went wrong with the last one. */
export interface MediaTrash {
	trash: (mediaId: string) => void;
	restore: (mediaId: string) => void;
	error: string | undefined;
}

export const useMediaTrash = (): MediaTrash => {
	const queryClient = useQueryClient();
	// Both sides of the trash are listed under this key's prefix, so one invalidation covers whichever
	// of them is open, along with every filter already fetched under it
	const refreshListing = async () => {
		await queryClient.invalidateQueries({ queryKey: getListMediaQueryKey() });
	};
	const trash = useTrashMedia({ mutation: { onSuccess: refreshListing } });
	const restore = useRestoreMedia({ mutation: { onSuccess: refreshListing } });

	return {
		trash: (mediaId) => {
			trash.mutate({ id: mediaId });
		},
		restore: (mediaId) => {
			restore.mutate({ id: mediaId });
		},
		error: toMutationFailure(trash, 204) ?? toMutationFailure(restore, 204),
	};
};
