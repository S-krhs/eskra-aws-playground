// In scope: running the operations that move a stored object one after another within this process
// Out of scope: what a move does, how a key is chosen, moves another process makes

// Settles either way, so a move that fails neither holds back nor fails the ones queued behind it
let tail: Promise<unknown> = Promise.resolve();

/**
 * Storage checks that a destination key is free and only then copies into it, so two moves racing for
 * one name could both pass the check, and one would overwrite the other before both sources are
 * deleted. This server runs as a single instance, so queuing here covers every request the screen sends
 * — from any tab — but not a process of its own such as the sync.
 * The row is read inside the queued work too, so a second request for the same media sees where the
 * first one left it.
 */
export const runInTurn = <T>(work: () => Promise<T>): Promise<T> => {
	const run = tail.then(work);

	tail = run.then(
		() => {
			return undefined;
		},
		() => {
			return undefined;
		},
	);

	return run;
};
