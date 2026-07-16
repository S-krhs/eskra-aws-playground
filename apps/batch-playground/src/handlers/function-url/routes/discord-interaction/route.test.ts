import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FunctionUrlEvent, FunctionUrlResponse } from "../../schema.js";
import { discordInteractionRoute } from "./route.js";

const verifier = vi.hoisted(() => {
	return { verifyInteractionSignature: vi.fn() };
});

vi.mock(
	"../../../../external-protocols/discord-signature/verify-interaction-signature.js",
	() => {
		return {
			verifyInteractionSignature: verifier.verifyInteractionSignature,
		};
	},
);

vi.mock("sst/resource", () => {
	return {
		Resource: { DiscordInteractionPublicKey: { value: "test-public-key" } },
	};
});

const timestamp = "1720000000";
const signature = "test-signature";
const targetUserId = "111111111111111111";
const otherUserId = "222222222222222222";

const buildEvent = (
	rawBody: string,
	options: { base64?: boolean } = {},
): FunctionUrlEvent => {
	return {
		rawPath: "/discord/interactions",
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
		data: { custom_id: customId },
		member: { user: { id: pressedUserId } },
	});
};

/** 成功 response であることを確認し、Discord payload を取り出す。 */
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
});

describe("discordInteractionRoute", () => {
	it("署名検証に失敗したら 401 response を返す", async () => {
		verifier.verifyInteractionSignature.mockReturnValue(false);

		const result = await discordInteractionRoute(buildEvent('{"type":1}'));

		expect(result.statusCode).toBe(401);
		expect(JSON.parse(result.body)).toEqual({ error: "署名が不正です。" });
	});

	it("PING には PONG を返す", async () => {
		const result = await discordInteractionRoute(buildEvent('{"type":1}'));

		expect(result.statusCode).toBe(200);
		expect(JSON.parse(result.body)).toEqual({ type: 1 });
	});

	it("base64 エンコードされた body はデコードした raw body で署名を検証する", async () => {
		const result = await discordInteractionRoute(
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

	it("対象ユーザーのボタン押下は元メッセージを選択結果へ更新しボタンを取り除く", async () => {
		const rawBody = buildComponentInteractionBody(
			`play-check-reminder:${targetUserId}:won`,
			targetUserId,
		);

		const body = okBody(await discordInteractionRoute(buildEvent(rawBody)));

		expect(body.type).toBe(7);
		expect(body.data?.components).toEqual([]);
		expect(body.data?.content).toContain("はい（勝った）");
	});

	it("対象外ユーザーのボタン押下は本人にだけ見える専用メッセージを返す", async () => {
		const rawBody = buildComponentInteractionBody(
			`play-check-reminder:${targetUserId}:won`,
			otherUserId,
		);

		const body = okBody(await discordInteractionRoute(buildEvent(rawBody)));

		expect(body.type).toBe(4);
		expect(body.data?.flags).toBe(64);
		expect(body.data?.content).toContain(`<@${targetUserId}>`);
	});

	it("不明な custom_id は対応外の ephemeral メッセージを返す", async () => {
		const rawBody = buildComponentInteractionBody(
			"unknown-feature:xxx",
			targetUserId,
		);

		const body = okBody(await discordInteractionRoute(buildEvent(rawBody)));

		expect(body.type).toBe(4);
		expect(body.data?.flags).toBe(64);
	});

	it("prefix 区切りのない custom_id は対応外の ephemeral メッセージを返す", async () => {
		const rawBody = buildComponentInteractionBody(
			"play-check-reminder",
			targetUserId,
		);

		const body = okBody(await discordInteractionRoute(buildEvent(rawBody)));

		expect(body.type).toBe(4);
		expect(body.data?.flags).toBe(64);
	});

	it("解釈できない選択肢は対応外の ephemeral メッセージを返す", async () => {
		const rawBody = buildComponentInteractionBody(
			`play-check-reminder:${targetUserId}:unknown`,
			targetUserId,
		);

		const body = okBody(await discordInteractionRoute(buildEvent(rawBody)));

		expect(body.type).toBe(4);
		expect(body.data?.flags).toBe(64);
	});

	it("autocomplete には空の候補一覧を返す", async () => {
		const result = await discordInteractionRoute(buildEvent('{"type":4}'));

		expect(result.statusCode).toBe(200);
		expect(JSON.parse(result.body)).toEqual({
			type: 8,
			data: { choices: [] },
		});
	});

	it("interaction body の JSON が不正なら 400 response を返す", async () => {
		const result = await discordInteractionRoute(buildEvent("not-a-json"));

		expect(result.statusCode).toBe(400);
		expect(JSON.parse(result.body)).toEqual({
			error: "リクエストが不正です。",
		});
	});
});
