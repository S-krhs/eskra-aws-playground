import { beforeEach, describe, expect, it, vi } from "vitest";
import { playCheckReminderJob } from "./play-check-reminder.js";

const discord = vi.hoisted(() => {
	return { constructor: vi.fn(), postChannelMessage: vi.fn() };
});
const channelSettingRepository = vi.hoisted(() => {
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
vi.mock(
	"@eskra-aws-playground/repositories/playground/channel-setting/repository.js",
	() => {
		return { channelSettingRepository };
	},
);
vi.mock("sst/resource", () => {
	return {
		Resource: { YacchoDiscordBotToken: { value: "yaccho-token" } },
	};
});

beforeEach(() => {
	discord.constructor.mockReset();
	discord.postChannelMessage.mockReset();
	channelSettingRepository.findMany.mockReset();
});

describe("playCheckReminderJob", () => {
	it("posts the question and choices to every user registered in the DB", async () => {
		channelSettingRepository.findMany.mockResolvedValue([
			{
				guildId: "1",
				channelId: "11",
				userId: "111",
			},
			{
				guildId: "2",
				channelId: "22",
				userId: "222",
			},
		]);
		discord.postChannelMessage.mockResolvedValue(undefined);

		await expect(playCheckReminderJob({})).resolves.toMatchObject({
			ok: true,
			job: "play-check-reminder",
			details: { configCount: 2 },
		});
		expect(discord.constructor).toHaveBeenCalledWith("yaccho-token");
		expect(channelSettingRepository.findMany).toHaveBeenCalledWith({
			applicationKey: "yaccho-bot",
			settingKey: "play-check-reminder",
		});
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

	it("tries every user before failing, even when some posts fail", async () => {
		channelSettingRepository.findMany.mockResolvedValue([
			{
				guildId: "1",
				channelId: "11",
				userId: "111",
			},
			{
				guildId: "2",
				channelId: "22",
				userId: "222",
			},
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
