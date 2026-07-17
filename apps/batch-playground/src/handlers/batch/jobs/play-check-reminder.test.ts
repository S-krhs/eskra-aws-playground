import { beforeEach, describe, expect, it, vi } from "vitest";
import { playCheckReminderJob } from "./play-check-reminder.js";

const discord = vi.hoisted(() => {
	return { constructor: vi.fn(), postChannelMessage: vi.fn() };
});
const reminderConfigRepository = vi.hoisted(() => {
	return { findMany: vi.fn() };
});

vi.mock(
	"@eskra-aws-playground/integration-discord/discord-bot-client.js",
	() => {
		return {
			DiscordBotClient: class {
				constructor(token: string) {
					discord.constructor(token);
				}

				public postChannelMessage = discord.postChannelMessage;
			},
		};
	},
);
vi.mock("@/features/play-check-reminder/reminder-config-store.js", () => {
	return {
		reminderConfigStore: reminderConfigRepository,
	};
});
vi.mock("sst/resource", () => {
	return {
		Resource: { YacchoDiscordBotToken: { value: "yaccho-token" } },
	};
});

beforeEach(() => {
	discord.constructor.mockReset();
	discord.postChannelMessage.mockReset();
	reminderConfigRepository.findMany.mockReset();
});

describe("playCheckReminderJob", () => {
	it("DBに登録された全利用者へ質問と選択肢を投稿する", async () => {
		reminderConfigRepository.findMany.mockResolvedValue([
			{ guildId: "1", channelId: "11", userId: "111" },
			{ guildId: "2", channelId: "22", userId: "222" },
		]);
		discord.postChannelMessage.mockResolvedValue(undefined);

		await expect(playCheckReminderJob({})).resolves.toMatchObject({
			ok: true,
			job: "play-check-reminder",
			details: { configCount: 2 },
		});
		expect(discord.constructor).toHaveBeenCalledWith("yaccho-token");
		expect(discord.postChannelMessage).toHaveBeenCalledTimes(4);
		expect(discord.postChannelMessage).toHaveBeenCalledWith(
			"11",
			expect.objectContaining({ content: expect.stringContaining("<@111>") }),
		);
		expect(discord.postChannelMessage).toHaveBeenCalledWith(
			"22",
			expect.objectContaining({ content: expect.stringContaining("<@222>") }),
		);
	});

	it("一部が失敗しても全利用者への投稿を試してから失敗する", async () => {
		reminderConfigRepository.findMany.mockResolvedValue([
			{ guildId: "1", channelId: "11", userId: "111" },
			{ guildId: "2", channelId: "22", userId: "222" },
		]);
		discord.postChannelMessage
			.mockRejectedValueOnce(new Error("first failed"))
			.mockResolvedValue(undefined);

		await expect(playCheckReminderJob({})).rejects.toThrow(
			"1件のリマインダー投稿に失敗しました。",
		);
		expect(discord.postChannelMessage).toHaveBeenCalledTimes(3);
	});
});
