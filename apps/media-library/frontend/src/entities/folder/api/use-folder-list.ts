// In scope: reading the folders there are to file into, for anything that offers them
// Out of scope: moving a media object, filtering the listing, rendering
import { useListFolders } from "@/shared/api";

/**
 * The folder paths, by name.
 * Empty while the first read is in flight and where nothing is filed anywhere — a picker reads the
 * same either way, so the two aren't told apart here.
 */
export const useFolderList = (): string[] => {
	const query = useListFolders();

	return query.data?.status === 200 ? query.data.data.folders : [];
};
