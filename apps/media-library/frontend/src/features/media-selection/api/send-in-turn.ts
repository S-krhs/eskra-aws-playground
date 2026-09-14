// In scope: sending one request per media object, one after another, and which of them went through
// Out of scope: which request is sent, where the run stands on screen, refreshing anything afterwards
import { readRejection, readResponseFailure } from "@/shared/api";

/**
 * Never two at once: the server queues every move itself, so sending them together gains nothing and
 * only holds each request open until its turn comes.
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
