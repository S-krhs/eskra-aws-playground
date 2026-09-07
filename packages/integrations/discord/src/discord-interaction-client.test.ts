import { afterEach, describe, expect, it, vi } from "vitest";

import {
	DiscordInteractionClient,
	DiscordInteractionError,
	type DiscordInteractionMessagePayload,
	type DiscordInteractionResponseDetails,
} from "./discord-interaction-client.js";

const APPLICATION_ID = "123456789012345678";
const INTERACTION_TOKEN = "super-secret-interaction-token";

const buildPayload = (): DiscordInteractionMessagePayload => {
	return {
		content: "うけたまかしこまつかまつり〜",
		components: [],
		allowed_mentions: { parse: [] },
	};
};

describe("DiscordInteractionClient", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("rejects a non-numeric application ID and an empty interaction token", () => {
		expect(() => {
			return new DiscordInteractionClient("not-a-snowflake", INTERACTION_TOKEN);
		}).toThrow(DiscordInteractionError);

		expect(() => {
			return new DiscordInteractionClient(APPLICATION_ID, "   ");
		}).toThrow(DiscordInteractionError);
	});

	it("PATCHes @original to edit the original message", async () => {
		const fetchMock = vi.fn(async () => {
			return new Response(null, { status: 200 });
		});
		vi.stubGlobal("fetch", fetchMock);

		const client = new DiscordInteractionClient(
			APPLICATION_ID,
			INTERACTION_TOKEN,
		);
		const payload = buildPayload();
		await client.editOriginalResponse(payload);

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0] as unknown as [
			string,
			RequestInit,
		];

		expect(url).toBe(
			`https://discord.com/api/v10/webhooks/${APPLICATION_ID}/${INTERACTION_TOKEN}/messages/@original`,
		);
		expect(init.method).toBe("PATCH");
		expect(JSON.parse(init.body as string)).toEqual(payload);
	});

	it("POSTs a follow-up message to the webhook URL", async () => {
		const fetchMock = vi.fn(async () => {
			return new Response(null, { status: 200 });
		});
		vi.stubGlobal("fetch", fetchMock);

		const client = new DiscordInteractionClient(
			APPLICATION_ID,
			INTERACTION_TOKEN,
		);
		await client.postFollowupMessage(buildPayload());

		const [url, init] = fetchMock.mock.calls[0] as unknown as [
			string,
			RequestInit,
		];

		expect(url).toBe(
			`https://discord.com/api/v10/webhooks/${APPLICATION_ID}/${INTERACTION_TOKEN}`,
		);
		expect(init.method).toBe("POST");
	});

	it("strips the interaction token out of the failure body", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				return new Response(`token=${INTERACTION_TOKEN}`, { status: 404 });
			}),
		);

		const client = new DiscordInteractionClient(
			APPLICATION_ID,
			INTERACTION_TOKEN,
		);
		const error = await client
			.editOriginalResponse(buildPayload())
			.catch((error: unknown) => {
				return error;
			});

		expect(error).toBeInstanceOf(DiscordInteractionError);
		expect((error as DiscordInteractionError).message).toBe(
			"Discord Interaction API 応答が失敗しました: 404",
		);

		const details = (error as DiscordInteractionError)
			.responseDetails as DiscordInteractionResponseDetails;
		expect(details.body).toContain("[redacted-discord-interaction-token]");
		expect(details.body).not.toContain(INTERACTION_TOKEN);
	});

	it("keeps the interaction token out of a fetch exception's message", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				throw new Error(`接続に失敗しました: ${INTERACTION_TOKEN}`);
			}),
		);

		const client = new DiscordInteractionClient(
			APPLICATION_ID,
			INTERACTION_TOKEN,
		);
		const error = await client
			.editOriginalResponse(buildPayload())
			.catch((error: unknown) => {
				return error;
			});

		expect(error).toBeInstanceOf(DiscordInteractionError);
		expect((error as DiscordInteractionError).message).not.toContain(
			INTERACTION_TOKEN,
		);
		expect((error as DiscordInteractionError).message).toContain(
			"[redacted-discord-interaction-token]",
		);
	});
});
