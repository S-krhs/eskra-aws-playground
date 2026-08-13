import type { DiscordInteractionCallback } from "@eskra-aws-playground/integration-discord/discord-interaction.js";
import { parseInteraction } from "@eskra-aws-playground/integration-discord/parse-interaction.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { playCheckReminderOperation } from "./play-check-reminder-operation.js";

const sqs = vi.hoisted(() => {
	return { sendMessages: vi.fn() };
});

vi.mock("@eskra-aws-playground/integration-sqs/sqs-message-sender.js", () => {
	return {
		SqsMessageSender: class {
			sendMessages = sqs.sendMessages;
		},
	};
});

vi.mock("sst/resource", () => {
	return {
		Resource: {
			PlaygroundInteractionQueue: { url: "https://sqs.test/interaction-queue" },
		},
	};
});

const callback: DiscordInteractionCallback = {
	applicationId: "999",
	token: "tok",
};

const execute = (customId: string, pressedUserId: string) => {
	const interaction = parseInteraction(
		JSON.stringify({
			type: 3,
			data: { custom_id: customId },
			user: { id: pressedUserId },
		}),
	);
	if (interaction?.kind !== "message-component") {
		throw new Error("test interaction の parse に失敗しました");
	}

	return playCheckReminderOperation(interaction, callback);
};

beforeEach(() => {
	sqs.sendMessages.mockReset();
});

describe("playCheckReminderOperation", () => {
	it.each([["won"], ["lost"], ["not-played"]])(
		"対象ユーザーの %s 選択は結果反映ジョブを enqueue し deferred update で ACK する",
		async (action) => {
			const result = await execute(`play-check-reminder:123:${action}`, "123");

			expect(sqs.sendMessages).toHaveBeenCalledWith([
				{
					id: "interaction-job",
					body: {
						job: "play-check-reminder-choice",
						applicationId: "999",
						token: "tok",
						action,
					},
				},
			]);
			expect(result).toEqual({ kind: "OK", data: { type: 6 } });
		},
	);

	it("対象外ユーザーには enqueue せず即時の専用メッセージ payload を返す", async () => {
		const result = await execute("play-check-reminder:123:won", "999");

		expect(sqs.sendMessages).not.toHaveBeenCalled();
		expect(result).toEqual({
			kind: "OK",
			data: {
				type: 4,
				data: {
					content: "よよよ……これは <@123> さん専用なのです",
					flags: 64,
					allowed_mentions: { parse: [] },
				},
			},
		});
	});

	it("リマインダーの選択と解釈できない interaction には undefined を返す", async () => {
		expect(await execute("unknown:payload", "123")).toBeUndefined();
		expect(await execute("play-check-reminder::won", "123")).toBeUndefined();
		expect(
			await execute("play-check-reminder:123:unknown", "123"),
		).toBeUndefined();
		expect(sqs.sendMessages).not.toHaveBeenCalled();
	});
});
