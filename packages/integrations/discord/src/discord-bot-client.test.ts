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

	it("空の bot token を拒否する", () => {
		expect(() => {
			return new DiscordBotClient("");
		}).toThrow(DiscordBotError);

		expect(() => {
			return new DiscordBotClient("   ");
		}).toThrow(DiscordBotError);
	});

	it("数字のみでない channel ID を拒否する", async () => {
		const client = new DiscordBotClient(BOT_TOKEN);

		await expect(
			client.postChannelMessage("not-a-snowflake", buildPayload()),
		).rejects.toThrow(DiscordBotError);
		await expect(client.postChannelMessage("", buildPayload())).rejects.toThrow(
			DiscordBotError,
		);
	});

	it("チャンネルメッセージ API へ正しい URL・ヘッダー・payload で POST する", async () => {
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

	it("失敗応答の本文をエラーメッセージに含めず details で安全化する", async () => {
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

	it("タイムアウトすると DiscordBotError を投げる", async () => {
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

	it("fetch 例外のメッセージに bot token が混入しない", async () => {
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

	it("数字のみでない application ID・guild ID を拒否する", async () => {
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

	it("guild コマンド API へ正しい URL・メソッド・ヘッダー・payload で PUT する", async () => {
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

	it("global コマンド API へ正しい URL・メソッド・ヘッダー・payload で PUT する", async () => {
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

	it("guild コマンド API へ正しい URL・メソッド・ヘッダーで GET し、登録済みコマンドを返す", async () => {
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

	it("global コマンド API へ正しい URL・メソッド・ヘッダーで GET し、登録済みコマンドを返す", async () => {
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

	it("command 失敗応答の本文をエラーメッセージに含めず details で安全化する", async () => {
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
