import { describe, expect, it } from "vitest";
import { runInTurn } from "./run-in-turn.js";

const tick = async (): Promise<void> => {
	await new Promise((resolve) => {
		setTimeout(resolve, 1);
	});
};

describe("runInTurn", () => {
	it("starts the next work only once the one before it has settled", async () => {
		const events: string[] = [];
		const work = (name: string) => {
			return async () => {
				events.push(`start ${name}`);
				await tick();
				events.push(`end ${name}`);

				return name;
			};
		};

		const results = await Promise.all([
			runInTurn(work("a")),
			runInTurn(work("b")),
		]);

		expect(results).toEqual(["a", "b"]);
		expect(events).toEqual(["start a", "end a", "start b", "end b"]);
	});

	it("hands a failure to its own caller and still runs what was queued behind it", async () => {
		const failed = runInTurn(async () => {
			await tick();
			throw new Error("移動先の key が既に埋まっています");
		});
		const next = runInTurn(async () => {
			return "b";
		});

		await expect(failed).rejects.toThrow("移動先の key が既に埋まっています");
		await expect(next).resolves.toBe("b");
	});
});
