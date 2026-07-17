import { describe, expect, it } from "vitest";

import type { DiscordInteraction } from "@/external-protocols/discord-message/parse.js";
import { findInteractionOperation } from "./operation-routing.js";
import { autocompleteOperation } from "./operations/autocomplete-operation.js";
import { helloCommandOperation } from "./operations/hello-command-operation.js";
import { pingOperation } from "./operations/ping-operation.js";
import { playCheckReminderOperation } from "./operations/play-check-reminder-operation.js";

const commandInteraction = (name: string): DiscordInteraction => {
	return {
		kind: "application-command",
		userId: "123",
		command: { name, options: [] },
		context: { kind: "direct-message" },
	};
};

const componentInteraction = (prefix: string): DiscordInteraction => {
	return {
		kind: "message-component",
		customId: { prefix, target: "123", action: "won" },
		userId: "123",
	};
};

describe("findInteractionOperation", () => {
	it("PING と autocomplete を interaction kind から routing する", () => {
		expect(findInteractionOperation({ kind: "ping" })).toBe(pingOperation);
		expect(findInteractionOperation({ kind: "autocomplete" })).toBe(
			autocompleteOperation,
		);
	});

	it("明示した command 名で routing する", () => {
		expect(findInteractionOperation(commandInteraction("hello"))).toBe(
			helloCommandOperation,
		);
	});

	it("明示した message component prefix で routing する", () => {
		expect(
			findInteractionOperation(componentInteraction("play-check-reminder")),
		).toBe(playCheckReminderOperation);
	});

	it("どの route 定義にも一致しない interaction には operation を返さない", () => {
		expect(
			findInteractionOperation(commandInteraction("unknown")),
		).toBeUndefined();
		expect(
			findInteractionOperation(componentInteraction("unknown")),
		).toBeUndefined();
		expect(
			findInteractionOperation(
				componentInteraction("play-check-reminder-other"),
			),
		).toBeUndefined();
		expect(
			findInteractionOperation({ kind: "unsupported", discordType: 99 }),
		).toBeUndefined();
	});
});
