import { beforeEach, describe, expect, it, vi } from "vitest";

import { handler } from "./handler.js";

const discordInteraction = vi.hoisted(() => {
	return {
		editOriginalResponse: vi.fn(),
		constructorCalls: [] as Array<[string, string]>,
	};
});

const channelSettingRepository = vi.hoisted(() => {
	return {
		save: vi.fn(),
		deleteByGuildIdAndUserId: vi.fn(),
	};
});

vi.mock(
	"@eskra-aws-playground/integration-discord/discord-interaction-client.js",
	() => {
		return {
			DiscordInteractionClient: class {
				constructor(applicationId: string, token: string) {
					discordInteraction.constructorCalls.push([applicationId, token]);
				}
				editOriginalResponse = discordInteraction.editOriginalResponse;
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

const buildEvent = (bodies: unknown[]) => {
	return {
		Records: bodies.map((body, index) => {
			return {
				messageId: `message-${index}`,
				body: JSON.stringify(body),
			};
		}),
	};
};

beforeEach(() => {
	discordInteraction.editOriginalResponse.mockReset();
	discordInteraction.constructorCalls.length = 0;
	channelSettingRepository.save.mockReset();
	channelSettingRepository.deleteByGuildIdAndUserId.mockReset();
});

describe("sqs-worker handler", () => {
	it("gamble-check-enable は設定を保存し確定メッセージへ差し替える", async () => {
		const response = await handler(
			buildEvent([
				{
					job: "gamble-check-enable",
					applicationId: "999",
					token: "tok",
					guildId: "111",
					channelId: "222",
					userId: "333",
				},
			]),
		);

		expect(channelSettingRepository.save).toHaveBeenCalledWith({
			applicationKey: "yaccho-bot",
			settingKey: "play-check-reminder",
			guildId: "111",
			channelId: "222",
			userId: "333",
		});
		expect(discordInteraction.constructorCalls[0]).toEqual(["999", "tok"]);
		expect(discordInteraction.editOriginalResponse).toHaveBeenCalledWith({
			content: "うけたまかしこまつかまつり〜",
			allowed_mentions: { parse: [] },
		});
		expect(response).toEqual({ batchItemFailures: [] });
	});

	it("gamble-check-disable は削除結果で文言を切り替える", async () => {
		channelSettingRepository.deleteByGuildIdAndUserId.mockResolvedValue(false);

		await handler(
			buildEvent([
				{
					job: "gamble-check-disable",
					applicationId: "999",
					token: "tok",
					guildId: "111",
					userId: "333",
				},
			]),
		);

		expect(discordInteraction.editOriginalResponse).toHaveBeenCalledWith({
			content: "よよよ……リマインダーはまだ設定されていないのです～",
			allowed_mentions: { parse: [] },
		});
	});

	it("play-check-reminder-choice は選択結果でボタンを外して差し替える", async () => {
		await handler(
			buildEvent([
				{
					job: "play-check-reminder-choice",
					applicationId: "999",
					token: "tok",
					action: "lost",
				},
			]),
		);

		expect(discordInteraction.editOriginalResponse).toHaveBeenCalledWith({
			content: "養分乙",
			components: [],
			allowed_mentions: { parse: [] },
		});
	});

	it("静的応答ジョブは固定の公開メッセージへ差し替える", async () => {
		await handler(
			buildEvent([
				{ job: "yaccho-hello-reply", applicationId: "999", token: "tok" },
			]),
		);

		expect(discordInteraction.editOriginalResponse).toHaveBeenCalledWith({
			content: "やおよろ～🌚",
			allowed_mentions: { parse: [] },
		});
	});

	it("失敗した record だけを batchItemFailures に載せ、他は処理を続ける", async () => {
		discordInteraction.editOriginalResponse.mockResolvedValueOnce(undefined);
		discordInteraction.editOriginalResponse.mockRejectedValueOnce(
			new Error("Discord API 応答が失敗しました: 500"),
		);

		const response = await handler(
			buildEvent([
				{ job: "yaccho-hello-reply", applicationId: "999", token: "tok" },
				{ job: "kaguya-inuihiroshi-reply", applicationId: "999", token: "tok" },
			]),
		);

		expect(response).toEqual({
			batchItemFailures: [{ itemIdentifier: "message-1" }],
		});
	});

	it("schema に合わない message body は失敗として再試行対象にする", async () => {
		const response = await handler(
			buildEvent([{ job: "unknown-job", applicationId: "999", token: "tok" }]),
		);

		expect(discordInteraction.editOriginalResponse).not.toHaveBeenCalled();
		expect(response).toEqual({
			batchItemFailures: [{ itemIdentifier: "message-0" }],
		});
	});
});
