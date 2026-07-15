import { generateKeyPairSync, type KeyObject, sign } from "node:crypto";

import { beforeAll, describe, expect, it, vi } from "vitest";

import { discordInteractionJob } from "./discord-interaction.js";

const settings = vi.hoisted(() => {
	return { publicKeyHex: "" };
});

vi.mock("./runtime-settings/discord-interaction-setting-resolver.js", () => {
	return {
		getDiscordInteractionSettings: () => {
			return { discordInteractionPublicKey: settings.publicKeyHex };
		},
	};
});

const timestamp = "1720000000";
const targetUserId = "111111111111111111";
const otherUserId = "222222222222222222";

let privateKey: KeyObject;

beforeAll(() => {
	const keyPair = generateKeyPairSync("ed25519");
	privateKey = keyPair.privateKey;
	settings.publicKeyHex = keyPair.publicKey
		.export({ format: "der", type: "spki" })
		.subarray(-32)
		.toString("hex");
});

const buildSignedEvent = (
	rawBody: string,
	options: { base64?: boolean; signatureOverride?: string } = {},
) => {
	const signature =
		options.signatureOverride ??
		sign(null, Buffer.from(timestamp + rawBody), privateKey).toString("hex");

	return {
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

describe("discordInteractionJob", () => {
	it("イベント形式が不正なら 400 を返す", async () => {
		const response = await discordInteractionJob({ body: "{}" });

		expect(response.statusCode).toBe(400);
	});

	it("署名が不正なら 401 を返す", async () => {
		const event = buildSignedEvent('{"type":1}', {
			signatureOverride: "ab".repeat(64),
		});

		const response = await discordInteractionJob(event);

		expect(response.statusCode).toBe(401);
	});

	it("PING には PONG を返す", async () => {
		const response = await discordInteractionJob(
			buildSignedEvent('{"type":1}'),
		);

		expect(response.statusCode).toBe(200);
		expect(JSON.parse(response.body)).toEqual({ type: 1 });
	});

	it("base64 エンコードされた body でも署名を検証して処理できる", async () => {
		const response = await discordInteractionJob(
			buildSignedEvent('{"type":1}', { base64: true }),
		);

		expect(response.statusCode).toBe(200);
		expect(JSON.parse(response.body)).toEqual({ type: 1 });
	});

	it("対象ユーザーのボタン押下は元メッセージを選択結果へ更新しボタンを取り除く", async () => {
		const rawBody = buildComponentInteractionBody(
			`play-check-reminder:${targetUserId}:won`,
			targetUserId,
		);

		const response = await discordInteractionJob(buildSignedEvent(rawBody));

		expect(response.statusCode).toBe(200);
		const responseBody = JSON.parse(response.body);
		expect(responseBody.type).toBe(7);
		expect(responseBody.data.components).toEqual([]);
		expect(responseBody.data.content).toContain("はい（勝った）");
	});

	it("対象外ユーザーのボタン押下は本人にだけ見える専用メッセージを返す", async () => {
		const rawBody = buildComponentInteractionBody(
			`play-check-reminder:${targetUserId}:won`,
			otherUserId,
		);

		const response = await discordInteractionJob(buildSignedEvent(rawBody));

		expect(response.statusCode).toBe(200);
		const responseBody = JSON.parse(response.body);
		expect(responseBody.type).toBe(4);
		expect(responseBody.data.flags).toBe(64);
		expect(responseBody.data.content).toContain(`<@${targetUserId}>`);
	});

	it("不明な custom_id は対応外の ephemeral メッセージを返す", async () => {
		const rawBody = buildComponentInteractionBody(
			"unknown-feature:xxx",
			targetUserId,
		);

		const response = await discordInteractionJob(buildSignedEvent(rawBody));

		expect(response.statusCode).toBe(200);
		const responseBody = JSON.parse(response.body);
		expect(responseBody.type).toBe(4);
		expect(responseBody.data.flags).toBe(64);
	});

	it("autocomplete には空の候補一覧を返す", async () => {
		const response = await discordInteractionJob(
			buildSignedEvent('{"type":4}'),
		);

		expect(response.statusCode).toBe(200);
		expect(JSON.parse(response.body)).toEqual({
			type: 8,
			data: { choices: [] },
		});
	});

	it("interaction body の JSON が不正なら 400 を返す", async () => {
		const response = await discordInteractionJob(
			buildSignedEvent("not-a-json"),
		);

		expect(response.statusCode).toBe(400);
	});
});
