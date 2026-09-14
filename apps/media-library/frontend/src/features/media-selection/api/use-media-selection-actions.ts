// In scope: filing, trashing or restoring several media objects in one run, and refreshing what shows them
// Out of scope: holding the selection, rendering, the words shown for any of it
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
	getListFoldersQueryKey,
	getListMediaQueryKey,
	getListTagsQueryKey,
	moveMedia,
	restoreMedia,
	trashMedia,
} from "@/shared/api";
import { sendInTurn } from "./send-in-turn.js";

export type SelectionAction = "move" | "trash" | "restore";

/** A run with any failure carries only the first one's wording. */
export type SelectionRunStatus =
	| { kind: "idle" }
	| {
			kind: "pending";
			action: SelectionAction;
			settledCount: number;
			totalCount: number;
	  }
	| { kind: "done"; action: SelectionAction; totalCount: number }
	| {
			kind: "failed";
			action: SelectionAction;
			totalCount: number;
			failedCount: number;
			message: string;
	  };

/**
 * The three share one run, so only one goes at a time and the status always belongs to the last one
 * asked for. Each `onFinished` receives the ids that went through, once the listing has been read again.
 */
export interface MediaSelectionActions {
	move: (
		mediaIds: string[],
		logicalPath: string,
		onFinished: (succeededIds: string[]) => void,
	) => void;
	trash: (
		mediaIds: string[],
		onFinished: (succeededIds: string[]) => void,
	) => void;
	restore: (
		mediaIds: string[],
		onFinished: (succeededIds: string[]) => void,
	) => void;
	status: SelectionRunStatus;
}

interface Run {
	action: SelectionAction;
	ids: string[];
	send: (id: string) => Promise<unknown>;
}

export const useMediaSelectionActions = (): MediaSelectionActions => {
	const queryClient = useQueryClient();
	const [settledCount, setSettledCount] = useState(0);
	const mutation = useMutation({
		mutationFn: async (run: Run) => {
			return await sendInTurn({
				ids: run.ids,
				send: run.send,
				onSettled: () => {
					setSettledCount((count) => {
						return count + 1;
					});
				},
			});
		},
		// A move can bring a folder into being, and each of the three changes which media a tag count covers
		onSettled: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: getListMediaQueryKey() }),
				queryClient.invalidateQueries({ queryKey: getListFoldersQueryKey() }),
				queryClient.invalidateQueries({ queryKey: getListTagsQueryKey() }),
			]);
		},
	});
	const start = (
		run: Run,
		onFinished: (succeededIds: string[]) => void,
	): void => {
		// Reset here rather than inside the run, which starts a tick later and would show the last count until then
		setSettledCount(0);
		mutation.mutate(run, {
			onSuccess: (result) => {
				onFinished(result.succeededIds);
			},
		});
	};
	const toStatus = (): SelectionRunStatus => {
		const run = mutation.variables;

		if (!run) {
			return { kind: "idle" };
		}

		const totalCount = run.ids.length;

		if (mutation.isPending) {
			return { kind: "pending", action: run.action, settledCount, totalCount };
		}

		if (!mutation.data) {
			return { kind: "idle" };
		}

		const { failures } = mutation.data;
		const [message] = failures;

		return message === undefined
			? { kind: "done", action: run.action, totalCount }
			: {
					kind: "failed",
					action: run.action,
					totalCount,
					failedCount: failures.length,
					message,
				};
	};

	return {
		move: (mediaIds, logicalPath, onFinished) => {
			start(
				{
					action: "move",
					ids: mediaIds,
					send: (id) => {
						return moveMedia(id, { logicalPath });
					},
				},
				onFinished,
			);
		},
		trash: (mediaIds, onFinished) => {
			start({ action: "trash", ids: mediaIds, send: trashMedia }, onFinished);
		},
		restore: (mediaIds, onFinished) => {
			start(
				{ action: "restore", ids: mediaIds, send: restoreMedia },
				onFinished,
			);
		},
		status: toStatus(),
	};
};
