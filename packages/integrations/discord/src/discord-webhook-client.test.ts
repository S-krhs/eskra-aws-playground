import { afterEach, describe, expect, it, vi } from "vitest";

import {
	DiscordWebhookClient,
	DiscordWebhookError,
	type DiscordWebhookResponseDetails,
} from "./discord-webhook-client.js";

describe("DiscordWebhookClient", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

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

	it("失敗応答の本文をエラーメッセージに含めず details で安全化する", async () => {
		const webhookUrl =
			"https://discord.com/api/webhooks/1234567890/super-secret-token";
		const responseBody = `${webhookUrl} ${"x".repeat(700)}`;

		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(responseBody, { status: 400 })),
		);

		const client = new DiscordWebhookClient(webhookUrl);
		const error = await client.postMessage("hello").catch((error: unknown) => {
			return error;
		});

		expect(error).toBeInstanceOf(DiscordWebhookError);
		expect(error.message).toBe("Discord Webhook 応答が失敗しました: 400");
		expect(error.message).not.toContain("super-secret-token");

		const details = (error as DiscordWebhookError)
			.responseDetails as DiscordWebhookResponseDetails;

		expect(details.status).toBe(400);
		expect(details.body).toContain("[redacted-discord-webhook-url]");
		expect(details.body).not.toContain("super-secret-token");
		expect(details.body.length).toBeLessThanOrEqual(512);
	});
});
