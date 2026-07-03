import { describe, expect, it } from "vitest";

import {
	DiscordWebhookClient,
	DiscordWebhookError,
} from "./discord-webhook-client.js";

describe("DiscordWebhookClient", () => {
	it("Discord Webhook URL だけを受け付ける", () => {
		expect(
			() =>
				new DiscordWebhookClient(
					"https://discord.com/api/webhooks/1234567890/token",
				),
		).not.toThrow();

		expect(
			() =>
				new DiscordWebhookClient(
					"https://discordapp.com/api/webhooks/1234567890/token",
				),
		).not.toThrow();
	});

	it("https 以外の Discord Webhook URL を拒否する", () => {
		expect(
			() =>
				new DiscordWebhookClient(
					"http://discord.com/api/webhooks/1234567890/token",
				),
		).toThrow(DiscordWebhookError);
	});

	it("Discord 以外のホストを拒否する", () => {
		expect(
			() =>
				new DiscordWebhookClient(
					"https://example.com/api/webhooks/1234567890/token",
				),
		).toThrow(DiscordWebhookError);
	});

	it("Discord Webhook API 以外のパスを拒否する", () => {
		expect(
			() => new DiscordWebhookClient("https://discord.com/api/users/@me"),
		).toThrow(DiscordWebhookError);
	});
});
