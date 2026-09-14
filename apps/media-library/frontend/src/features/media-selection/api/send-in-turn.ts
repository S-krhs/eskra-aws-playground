// In scope: sending one request per media object, one after another, and which of them went through
// Out of scope: which request is sent, where the run stands on screen, refreshing anything afterwards
import { readRejection, readResponseFailure } from "@/shared/api";

/**
 * Never two at once: storage checks that a destination key is free and only then copies into it, so
 * two objects sharing a file name moved into one folder together could both pass the check, and one
 * would overwrite the other before both sources are deleted.
 * A failure doesn't stop the rest.
 */
export const sendInTurn = async (input: {
	ids: string[];
	send: (id: string) => Promise<unknown>;
	onSettled: () => void;
}): Promise<{ succeededIds: string[]; failures: string[] }> => {
	const succeededIds: string[] = [];
	const failures: string[] = [];

	for (const id of input.ids) {
		try {
			const failure = readResponseFailure(await input.send(id));

			if (failure === undefined) {
				succeededIds.push(id);
			} else {
				failures.push(failure);
			}
		} catch (error) {
			failures.push(readRejection(error));
		}

		input.onSettled();
	}

	return { succeededIds, failures };
};
