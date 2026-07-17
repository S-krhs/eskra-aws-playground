import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DiscordApplicationCommandInteraction } from "@/external-protocols/discord-message/parse.js";
import { playCheckReminderCommandOperation } from "./play-check-reminder-command-operation.js";

const reminderConfigRepository = vi.hoisted(() => {
	return {
		save: vi.fn(),
		deleteByGuildIdAndUserId: vi.fn(),
	};
});

vi.mock(
	"@eskra-aws-playground/repositories/playground/play-check-reminder-config/repository.js",
	() => {
		return {
			playCheckReminderConfigRepository: reminderConfigRepository,
		};
	},
);

const commandInteraction = (
	options: DiscordApplicationCommandInteraction["command"]["options"],
	userId = "333",
): DiscordApplicationCommandInteraction => {
	return {
		kind: "application-command",
		userId,
		command: { name: "play-check-reminder", options },
		context: {
			kind: "guild",
			guildId: "111",
			channelId: "222",
		},
	};
};

beforeEach(() => {
	reminderConfigRepository.save.mockReset();
	reminderConfigRepository.deleteByGuildIdAndUserId.mockReset();
});

describe("playCheckReminderCommandOperation", () => {
	it("現在の Guild・channel と実行者本人で有効化する", async () => {
		const result = await playCheckReminderCommandOperation(
			commandInteraction([{ kind: "subcommand", name: "enable", options: [] }]),
		);

		expect(reminderConfigRepository.save).toHaveBeenCalledWith({
			guildId: "111",
			channelId: "222",
			userId: "333",
		});
		expect(result).toEqual({
			kind: "OK",
			data: {
				type: 4,
				data: {
					content: "このチャンネルで自分のリマインダーを有効にしました。",
					flags: 64,
					allowed_mentions: { parse: [] },
				},
			},
		});
	});

	it("disable subcommand で実行者本人の設定だけを削除する", async () => {
		reminderConfigRepository.deleteByGuildIdAndUserId.mockResolvedValue(true);

		const result = await playCheckReminderCommandOperation(
			commandInteraction([
				{ kind: "subcommand", name: "disable", options: [] },
			]),
		);

		expect(
			reminderConfigRepository.deleteByGuildIdAndUserId,
		).toHaveBeenCalledWith("111", "333");
		expect(result?.data.data.content).toBe(
			"自分のリマインダーを無効にしました。",
		);
	});

	it("DM からの実行は設定を変更しない", async () => {
		const result = await playCheckReminderCommandOperation({
			kind: "application-command",
			userId: "333",
			command: { name: "play-check-reminder", options: [] },
			context: { kind: "direct-message" },
		});

		expect(reminderConfigRepository.save).not.toHaveBeenCalled();
		expect(
			reminderConfigRepository.deleteByGuildIdAndUserId,
		).not.toHaveBeenCalled();
		expect(result?.data.data.content).toContain("サーバー内");
	});
});
