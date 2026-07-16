import { afterEach, describe, expect, it, vi } from "vitest";

import {
	DiscordBotClient,
	DiscordBotError,
	type DiscordBotResponseDetails,
	type DiscordChannelMessagePayload,
} from "./discord-bot-client.js";

const BOT_TOKEN = "super-secret-bot-token";
const CHANNEL_ID = "123456789012345678";

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
});
