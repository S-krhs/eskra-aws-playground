// In scope: filing one media object into a folder, and refreshing what shows where it sits
// Out of scope: rendering, holding the folder being typed, reading the folders there are
import { useQueryClient } from "@tanstack/react-query";
import {
	getListFoldersQueryKey,
	getListMediaQueryKey,
	toMutationFailure,
	useMoveMedia,
} from "@/shared/api";

/**
 * Moving one media object, and what to show while it goes.
 * A move copies the object inside R2 before the old key is dropped, so a large video takes a while.
 */
export interface MediaMove {
	move: (mediaId: string, logicalPath: string) => void;
	message: string | undefined;
}

export const useMediaMove = (): MediaMove => {
	const queryClient = useQueryClient();
	const move = useMoveMedia({
		mutation: {
			onSuccess: async () => {
				// The listing carries the folder it shows, and a folder can have come into being here
				await Promise.all([
					queryClient.invalidateQueries({ queryKey: getListMediaQueryKey() }),
					queryClient.invalidateQueries({ queryKey: getListFoldersQueryKey() }),
				]);
			},
		},
	});

	return {
		move: (mediaId, logicalPath) => {
			move.mutate({ id: mediaId, data: { logicalPath } });
		},
		message: move.isPending ? "移しています…" : toMutationFailure(move, 200),
	};
};
