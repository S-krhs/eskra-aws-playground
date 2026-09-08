import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
	FunctionUrlEvent,
	FunctionUrlResponse,
} from "@/handlers/schema.js";
import { paths } from "../../contracts/paths.js";
import { yacchoBotInteractionRoute } from "./route.js";

const verifier = vi.hoisted(() => {
	return { verifyInteractionSignature: vi.fn() };
});

vi.mock(
	"@eskra-aws-playground/integration-discord/verify-interaction-signature.js",
	() => {
		return {
			verifyInteractionSignature: verifier.verifyInteractionSignature,
		};
	},
);

vi.mock("sst/resource", () => {
	return {
		Resource: {
			YacchoDiscordInteractionPublicKey: { value: "test-public-key" },
			PlaygroundInteractionQueue: { url: "https://sqs.test/interaction-queue" },
		},
	};
});

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

const timestamp = "1720000000";
const signature = "test-signature";
const applicationId = "888888888888888888";
const token = "interaction-token";
const targetUserId = "111111111111111111";
const otherUserId = "222222222222222222";

const buildEvent = (
	rawBody: string,
	options: { base64?: boolean } = {},
): FunctionUrlEvent => {
	return {
		rawPath: paths.yacchoBotInteraction,
		headers: {
			"x-signature-ed25519": signature,
			"x-signature-timestamp": timestamp,
		},
		body: options.base64
			? Buffer.from(rawBody, "utf8").toString("base64")
			: rawBody,
		isBase64Encoded: options.base64 ?? false,
	};
};

const buildComponentInteractionBody = (
	customId: string,
	pressedUserId: string,
): string => {
	return JSON.stringify({
		type: 3,
		application_id: applicationId,
		token,
		data: { custom_id: customId },
		member: { user: { id: pressedUserId } },
	});
};

const buildCommandInteractionBody = (
	name: string,
	extra: Record<string, unknown>,
): string => {
	return JSON.stringify({
		type: 2,
		application_id: applicationId,
		token,
		data: { name },
		...extra,
	});
};

/** Checks the response succeeded and pulls the Discord payload out of it. */
const okBody = (
	response: FunctionUrlResponse,
): {
	type: number;
	data?: { components?: unknown[]; content?: string; flags?: number };
} => {
	if (response.statusCode !== 200) {
		throw new Error(`200 response を期待したが ${response.statusCode} だった`);
	}

	return JSON.parse(response.body) as {
		type: number;
		data?: { components?: unknown[]; content?: string; flags?: number };
	};
};

beforeEach(() => {
	verifier.verifyInteractionSignature.mockReset();
	verifier.verifyInteractionSignature.mockReturnValue(true);
	sqs.sendMessages.mockReset();
});

describe("yacchoBotInteractionRoute", () => {
	it("returns 401 when signature verification fails", async () => {
		verifier.verifyInteractionSignature.mockReturnValue(false);

		const result = await yacchoBotInteractionRoute(buildEvent('{"type":1}'));

		expect(result.statusCode).toBe(401);
		expect(JSON.parse(result.body)).toEqual({ error: "署名が不正です。" });
	});

	it("answers a PING with a PONG", async () => {
		const result = await yacchoBotInteractionRoute(buildEvent('{"type":1}'));

		expect(result.statusCode).toBe(200);
		expect(JSON.parse(result.body)).toEqual({ type: 1 });
	});

	it("verifies the signature against the decoded raw body for a base64-encoded body", async () => {
		const result = await yacchoBotInteractionRoute(
			buildEvent('{"type":1}', { base64: true }),
		);

		expect(result.statusCode).toBe(200);
		expect(verifier.verifyInteractionSignature).toHaveBeenCalledWith({
			publicKey: "test-public-key",
			signature,
			timestamp,
			rawBody: '{"type":1}',
		});
	});

	it("enqueues the recording job and ACKs with a deferred update when the addressed user presses a button", async () => {
		const rawBody = buildComponentInteractionBody(
			`play-check-reminder:${targetUserId}:won`,
			targetUserId,
		);

		const body = okBody(await yacchoBotInteractionRoute(buildEvent(rawBody)));

		expect(sqs.sendMessages).toHaveBeenCalledWith([
			{
				id: "interaction-job",
				body: {
					job: "play-check-reminder-choice",
					applicationId,
					token,
					action: "won",
				},
			},
		]);
		expect(body.type).toBe(6);
	});

	it("enqueues nothing and answers with a message only they can see when someone else presses a button", async () => {
		const rawBody = buildComponentInteractionBody(
			`play-check-reminder:${targetUserId}:won`,
			otherUserId,
		);

		const body = okBody(await yacchoBotInteractionRoute(buildEvent(rawBody)));

		expect(sqs.sendMessages).not.toHaveBeenCalled();
		expect(body.type).toBe(4);
		expect(body.data?.flags).toBe(64);
		expect(body.data?.content).toContain(`<@${targetUserId}>`);
	});

	it("answers an unknown custom_id with the unsupported ephemeral message", async () => {
		const rawBody = buildComponentInteractionBody(
			"unknown-feature:xxx",
			targetUserId,
		);

		const body = okBody(await yacchoBotInteractionRoute(buildEvent(rawBody)));

		expect(sqs.sendMessages).not.toHaveBeenCalled();
		expect(body.type).toBe(4);
		expect(body.data?.flags).toBe(64);
		expect(body.data?.content).toBe("自分で調べろｶｽ");
	});

	it("answers a custom_id without prefix separators with the unsupported ephemeral message", async () => {
		const rawBody = buildComponentInteractionBody(
			"play-check-reminder",
			targetUserId,
		);

		const body = okBody(await yacchoBotInteractionRoute(buildEvent(rawBody)));

		expect(body.type).toBe(4);
		expect(body.data?.flags).toBe(64);
	});

	it("answers an unreadable choice with the unsupported ephemeral message", async () => {
		const rawBody = buildComponentInteractionBody(
			`play-check-reminder:${targetUserId}:unknown`,
			targetUserId,
		);

		const body = okBody(await yacchoBotInteractionRoute(buildEvent(rawBody)));

		expect(body.type).toBe(4);
		expect(body.data?.flags).toBe(64);
	});

	it("enqueues the greeting job for /hello and ACKs with a public deferred response", async () => {
		const rawBody = buildCommandInteractionBody("hello", {
			user: { id: targetUserId },
		});

		const body = okBody(await yacchoBotInteractionRoute(buildEvent(rawBody)));

		expect(sqs.sendMessages).toHaveBeenCalledWith([
			{
				id: "interaction-job",
				body: {
					job: "yaccho-hello-reply",
					applicationId,
					token,
				},
			},
		]);
		expect(body.type).toBe(5);
		expect(body.data?.flags).toBeUndefined();
	});

	it("enqueues the registration job for gamble-check-enable in a server channel", async () => {
		const rawBody = buildCommandInteractionBody("gamble-check-enable", {
			guild_id: "555555555555555555",
			channel_id: "666666666666666666",
			member: { user: { id: targetUserId } },
		});

		const body = okBody(await yacchoBotInteractionRoute(buildEvent(rawBody)));

		expect(sqs.sendMessages).toHaveBeenCalledWith([
			{
				id: "interaction-job",
				body: {
					job: "gamble-check-enable",
					applicationId,
					token,
					guildId: "555555555555555555",
					channelId: "666666666666666666",
					userId: targetUserId,
				},
			},
		]);
		expect(body.type).toBe(5);
		expect(body.data?.flags).toBe(64);
	});

	it("enqueues the removal job for gamble-check-disable", async () => {
		const rawBody = buildCommandInteractionBody("gamble-check-disable", {
			guild_id: "555555555555555555",
			member: { user: { id: targetUserId } },
		});

		const body = okBody(await yacchoBotInteractionRoute(buildEvent(rawBody)));

		expect(sqs.sendMessages).toHaveBeenCalledWith([
			{
				id: "interaction-job",
				body: {
					job: "gamble-check-disable",
					applicationId,
					token,
					guildId: "555555555555555555",
					userId: targetUserId,
				},
			},
		]);
		expect(body.type).toBe(5);
		expect(body.data?.flags).toBe(64);
	});

	it("answers with an ephemeral retry prompt instead of a deferred response when the enqueue fails", async () => {
		sqs.sendMessages.mockRejectedValue(
			new Error("SQS message の送信に失敗しました: interaction-job"),
		);
		const rawBody = buildCommandInteractionBody("hello", {
			user: { id: targetUserId },
		});

		const body = okBody(await yacchoBotInteractionRoute(buildEvent(rawBody)));

		expect(body.type).toBe(4);
		expect(body.data?.flags).toBe(64);
		expect(body.data?.content).toBe(
			"処理の受け付けに失敗しました。もう一度お試しください。",
		);
	});

	it("answers an unsupported command with the unsupported ephemeral message", async () => {
		const rawBody = buildCommandInteractionBody("unknown", {
			user: { id: targetUserId },
		});

		const body = okBody(await yacchoBotInteractionRoute(buildEvent(rawBody)));

		expect(sqs.sendMessages).not.toHaveBeenCalled();
		expect(body.type).toBe(4);
		expect(body.data?.flags).toBe(64);
	});

	it("answers an unsupported interaction type with the unsupported ephemeral message", async () => {
		const body = okBody(
			await yacchoBotInteractionRoute(buildEvent('{"type":99}')),
		);

		expect(body.type).toBe(4);
		expect(body.data?.flags).toBe(64);
	});

	it("answers an autocomplete with an empty candidate list", async () => {
		const result = await yacchoBotInteractionRoute(
			buildEvent(
				`{"type":4,"data":{"name":"hello"},"user":{"id":"${targetUserId}"}}`,
			),
		);

		expect(result.statusCode).toBe(200);
		expect(JSON.parse(result.body)).toEqual({
			type: 8,
			data: { choices: [] },
		});
	});

	it("returns 400 when the interaction body's JSON is malformed", async () => {
		const result = await yacchoBotInteractionRoute(buildEvent("not-a-json"));

		expect(result.statusCode).toBe(400);
		expect(JSON.parse(result.body)).toEqual({
			error: "リクエストが不正です。",
		});
	});
});
