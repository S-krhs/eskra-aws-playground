import { afterEach, describe, expect, it, vi } from "vitest";

import {
	DiscordBotClient,
	DiscordBotError,
	type DiscordBotResponseDetails,
	type DiscordChannelMessagePayload,
	type DiscordCommandDefinition,
} from "./discord-bot-client.js";

const BOT_TOKEN = "super-secret-bot-token";
const CHANNEL_ID = "123456789012345678";
const APPLICATION_ID = "111111111111111111";
const GUILD_ID = "222222222222222222";

const commands: readonly DiscordCommandDefinition[] = [
	{ name: "hello", description: "挨拶を返す" },
];

const buildPayload = (): DiscordChannelMessagePayload => {
	return {
		content: "hello",
		components: [
			{
				type: 1,
				components: [
					{
						type: 2,
						style: 1,
						label: "承認",
						custom_id: "approve",
					},
				],
			},
		],
		allowed_mentions: {
			parse: [],
			users: ["123456789012345678"],
		},
	};
};

describe("DiscordBotClient", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("rejects an empty bot token", () => {
		expect(() => {
			return new DiscordBotClient("");
		}).toThrow(DiscordBotError);

		expect(() => {
			return new DiscordBotClient("   ");
		}).toThrow(DiscordBotError);
	});

	it("rejects a channel ID that isn't numeric-only", async () => {
		const client = new DiscordBotClient(BOT_TOKEN);

		await expect(
			client.postChannelMessage("not-a-snowflake", buildPayload()),
		).rejects.toThrow(DiscordBotError);
		await expect(client.postChannelMessage("", buildPayload())).rejects.toThrow(
			DiscordBotError,
		);
	});

	it("POSTs to the channel-message API with the right URL, headers, and payload", async () => {
		const fetchMock = vi.fn(async () => {
			return new Response(null, { status: 200 });
		});
		vi.stubGlobal("fetch", fetchMock);

		const client = new DiscordBotClient(BOT_TOKEN);
		const payload = buildPayload();
		await client.postChannelMessage(CHANNEL_ID, payload);

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0] as unknown as [
			string,
			RequestInit,
		];

		expect(url).toBe(
			`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`,
		);
		expect(init.method).toBe("POST");
		expect(init.headers).toEqual({
			Authorization: `Bot ${BOT_TOKEN}`,
			"Content-Type": "application/json",
		});
		expect(JSON.parse(init.body as string)).toEqual(payload);
	});

	it("keeps the failure body out of the error message and sanitizes it in details", async () => {
		const responseBody = `token=${BOT_TOKEN} ${"x".repeat(700)}`;

		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				return new Response(responseBody, { status: 403 });
			}),
		);

		const client = new DiscordBotClient(BOT_TOKEN);
		const error = await client
			.postChannelMessage(CHANNEL_ID, buildPayload())
			.catch((error: unknown) => {
				return error;
			});

		expect(error).toBeInstanceOf(DiscordBotError);
		const errorMessage = (error as DiscordBotError).message;
		expect(errorMessage).toBe("Discord Bot API 応答が失敗しました: 403");
		expect(errorMessage).not.toContain(BOT_TOKEN);

		const details = (error as DiscordBotError)
			.responseDetails as DiscordBotResponseDetails;

		expect(details.status).toBe(403);
		expect(details.body).toContain("[redacted-discord-bot-token]");
		expect(details.body).not.toContain(BOT_TOKEN);
		expect(details.body.length).toBeLessThanOrEqual(512);
	});

	it("throws DiscordBotError on timeout", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async (_url: string, init: RequestInit) => {
				return new Promise<Response>((_resolve, reject) => {
					init.signal?.addEventListener("abort", () => {
						reject(
							new DOMException("The operation was aborted.", "AbortError"),
						);
					});
				});
			}),
		);

		const client = new DiscordBotClient(BOT_TOKEN);
		const error = await client
			.postChannelMessage(CHANNEL_ID, buildPayload(), { timeoutMs: 10 })
			.catch((error: unknown) => {
				return error;
			});

		expect(error).toBeInstanceOf(DiscordBotError);
		expect((error as DiscordBotError).message).toBe(
			"Discord Bot API リクエストがタイムアウトしました: 10ms",
		);
		expect((error as DiscordBotError).responseDetails).toEqual({
			timeoutMs: 10,
		});
	});

	it("keeps the bot token out of a fetch exception's message", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				throw new Error(`接続に失敗しました: Bot ${BOT_TOKEN}`);
			}),
		);

		const client = new DiscordBotClient(BOT_TOKEN);
		const error = await client
			.postChannelMessage(CHANNEL_ID, buildPayload())
			.catch((error: unknown) => {
				return error;
			});

		expect(error).toBeInstanceOf(DiscordBotError);
		expect((error as DiscordBotError).message).not.toContain(BOT_TOKEN);
		expect((error as DiscordBotError).message).toContain(
			"[redacted-discord-bot-token]",
		);
	});

	it("rejects an application ID or guild ID that isn't numeric-only", async () => {
		const client = new DiscordBotClient(BOT_TOKEN);

		await expect(
			client.overwriteGuildCommands("not-a-snowflake", GUILD_ID, commands),
		).rejects.toThrow(DiscordBotError);
		await expect(
			client.overwriteGuildCommands(APPLICATION_ID, "", commands),
		).rejects.toThrow(DiscordBotError);
		await expect(
			client.getGuildCommands("not-a-snowflake", GUILD_ID),
		).rejects.toThrow(DiscordBotError);
		await expect(
			client.overwriteGlobalCommands("not-a-snowflake", commands),
		).rejects.toThrow(DiscordBotError);
		await expect(client.getGlobalCommands("1".repeat(21))).rejects.toThrow(
			DiscordBotError,
		);
	});

	it("PUTs to the guild-commands API with the right URL, method, headers, and payload", async () => {
		const fetchMock = vi.fn(async () => {
			return new Response(null, { status: 200 });
		});
		vi.stubGlobal("fetch", fetchMock);

		const client = new DiscordBotClient(BOT_TOKEN);
		await client.overwriteGuildCommands(APPLICATION_ID, GUILD_ID, commands);

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0] as unknown as [
			string,
			RequestInit,
		];

		expect(url).toBe(
			`https://discord.com/api/v10/applications/${APPLICATION_ID}/guilds/${GUILD_ID}/commands`,
		);
		expect(init.method).toBe("PUT");
		expect(init.headers).toEqual({
			Authorization: `Bot ${BOT_TOKEN}`,
			"Content-Type": "application/json",
		});
		expect(JSON.parse(init.body as string)).toEqual(commands);
	});

	it("PUTs to the global-commands API with the right URL, method, headers, and payload", async () => {
		const fetchMock = vi.fn(async () => {
			return new Response(null, { status: 200 });
		});
		vi.stubGlobal("fetch", fetchMock);

		const client = new DiscordBotClient(BOT_TOKEN);
		await client.overwriteGlobalCommands(APPLICATION_ID, commands);

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0] as unknown as [
			string,
			RequestInit,
		];

		expect(url).toBe(
			`https://discord.com/api/v10/applications/${APPLICATION_ID}/commands`,
		);
		expect(init.method).toBe("PUT");
		expect(init.headers).toEqual({
			Authorization: `Bot ${BOT_TOKEN}`,
			"Content-Type": "application/json",
		});
		expect(JSON.parse(init.body as string)).toEqual(commands);
	});

	it("GETs the guild-commands API with the right URL/method/headers and returns the registered commands", async () => {
		const registered = [
			{ id: "999", name: "hello", description: "やおよろ～と挨拶を返す" },
		];
		const fetchMock = vi.fn(async () => {
			return new Response(JSON.stringify(registered), { status: 200 });
		});
		vi.stubGlobal("fetch", fetchMock);

		const client = new DiscordBotClient(BOT_TOKEN);
		const result = await client.getGuildCommands(APPLICATION_ID, GUILD_ID);

		expect(result).toEqual(registered);
		const [url, init] = fetchMock.mock.calls[0] as unknown as [
			string,
			RequestInit,
		];

		expect(url).toBe(
			`https://discord.com/api/v10/applications/${APPLICATION_ID}/guilds/${GUILD_ID}/commands`,
		);
		expect(init.method).toBe("GET");
		expect(init.headers).toEqual({ Authorization: `Bot ${BOT_TOKEN}` });
	});

	it("GETs the global-commands API with the right URL/method/headers and returns the registered commands", async () => {
		const registered = [
			{ id: "999", name: "hello", description: "やおよろ～と挨拶を返す" },
		];
		const fetchMock = vi.fn(async () => {
			return new Response(JSON.stringify(registered), { status: 200 });
		});
		vi.stubGlobal("fetch", fetchMock);

		const client = new DiscordBotClient(BOT_TOKEN);
		const result = await client.getGlobalCommands(APPLICATION_ID);

		expect(result).toEqual(registered);
		const [url, init] = fetchMock.mock.calls[0] as unknown as [
			string,
			RequestInit,
		];

		expect(url).toBe(
			`https://discord.com/api/v10/applications/${APPLICATION_ID}/commands`,
		);
		expect(init.method).toBe("GET");
		expect(init.headers).toEqual({ Authorization: `Bot ${BOT_TOKEN}` });
	});

	it("keeps a command failure body out of the error message and sanitizes it in details", async () => {
		const responseBody = `token=${BOT_TOKEN} ${"x".repeat(700)}`;

		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				return new Response(responseBody, { status: 403 });
			}),
		);

		const client = new DiscordBotClient(BOT_TOKEN);
		const error = await client
			.overwriteGuildCommands(APPLICATION_ID, GUILD_ID, commands)
			.catch((error: unknown) => {
				return error;
			});

		expect(error).toBeInstanceOf(DiscordBotError);
		const errorMessage = (error as DiscordBotError).message;
		expect(errorMessage).toBe("Discord Bot API 応答が失敗しました: 403");
		expect(errorMessage).not.toContain(BOT_TOKEN);

		const details = (error as DiscordBotError)
			.responseDetails as DiscordBotResponseDetails;

		expect(details.status).toBe(403);
		expect(details.body).toContain("[redacted-discord-bot-token]");
		expect(details.body).not.toContain(BOT_TOKEN);
	});
});
