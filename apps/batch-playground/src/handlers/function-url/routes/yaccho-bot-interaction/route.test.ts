import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
	FunctionUrlEvent,
	FunctionUrlResponse,
} from "@/handlers/function-url/schema.js";
import { paths } from "../../contracts/paths.js";
import { yacchoBotInteractionRoute } from "./route.js";

const verifier = vi.hoisted(() => {
	return { verifyInteractionSignature: vi.fn() };
});

vi.mock(
	"@/external-protocols/discord-signature/verify-interaction-signature.js",
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
		},
	};
});

const channelSettingRepository = vi.hoisted(() => {
	return { save: vi.fn(), deleteByGuildIdAndUserId: vi.fn() };
});

vi.mock(
	"@eskra-aws-playground/repositories/playground/channel-setting/repository.js",
	() => {
		return { channelSettingRepository };
	},
);

const timestamp = "1720000000";
const signature = "test-signature";
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
	channelSettingRepository.save.mockReset();
	channelSettingRepository.deleteByGuildIdAndUserId.mockReset();
});

describe("yacchoBotInteractionRoute", () => {
	it("署名検証に失敗したら 401 response を返す", async () => {
		verifier.verifyInteractionSignature.mockReturnValue(false);

		const result = await yacchoBotInteractionRoute(buildEvent('{"type":1}'));

		expect(result.statusCode).toBe(401);
		expect(JSON.parse(result.body)).toEqual({ error: "署名が不正です。" });
	});

	it("PING には PONG を返す", async () => {
		const result = await yacchoBotInteractionRoute(buildEvent('{"type":1}'));

		expect(result.statusCode).toBe(200);
		expect(JSON.parse(result.body)).toEqual({ type: 1 });
	});

	it("base64 エンコードされた body はデコードした raw body で署名を検証する", async () => {
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

	it("対象ユーザーのボタン押下は元メッセージを選択結果へ更新しボタンを取り除く", async () => {
		const rawBody = buildComponentInteractionBody(
			`play-check-reminder:${targetUserId}:won`,
			targetUserId,
		);

		const body = okBody(await yacchoBotInteractionRoute(buildEvent(rawBody)));

		expect(body.type).toBe(7);
		expect(body.data?.components).toEqual([]);
		expect(body.data?.content).toBe(
			"∈₍ ᐢ._.ᐢ₎ < やるじゃねぇか まぐれに頼る天才だな",
		);
	});

	it("対象外ユーザーのボタン押下は本人にだけ見える専用メッセージを返す", async () => {
		const rawBody = buildComponentInteractionBody(
			`play-check-reminder:${targetUserId}:won`,
			otherUserId,
		);

		const body = okBody(await yacchoBotInteractionRoute(buildEvent(rawBody)));

		expect(body.type).toBe(4);
		expect(body.data?.flags).toBe(64);
		expect(body.data?.content).toContain(`<@${targetUserId}>`);
	});

	it("不明な custom_id は対応外の ephemeral メッセージを返す", async () => {
		const rawBody = buildComponentInteractionBody(
			"unknown-feature:xxx",
			targetUserId,
		);

		const body = okBody(await yacchoBotInteractionRoute(buildEvent(rawBody)));

		expect(body.type).toBe(4);
		expect(body.data?.flags).toBe(64);
		expect(body.data?.content).toBe("自分で調べろｶｽ");
	});

	it("prefix 区切りのない custom_id は対応外の ephemeral メッセージを返す", async () => {
		const rawBody = buildComponentInteractionBody(
			"play-check-reminder",
			targetUserId,
		);

		const body = okBody(await yacchoBotInteractionRoute(buildEvent(rawBody)));

		expect(body.type).toBe(4);
		expect(body.data?.flags).toBe(64);
	});

	it("解釈できない選択肢は対応外の ephemeral メッセージを返す", async () => {
		const rawBody = buildComponentInteractionBody(
			`play-check-reminder:${targetUserId}:unknown`,
			targetUserId,
		);

		const body = okBody(await yacchoBotInteractionRoute(buildEvent(rawBody)));

		expect(body.type).toBe(4);
		expect(body.data?.flags).toBe(64);
	});

	it("/hello コマンドには挨拶メッセージを返す", async () => {
		const rawBody = JSON.stringify({
			type: 2,
			data: { name: "hello" },
			user: { id: targetUserId },
		});

		const body = okBody(await yacchoBotInteractionRoute(buildEvent(rawBody)));

		expect(body.type).toBe(4);
		expect(body.data?.content).toBe("やおよろ～🌚");
		expect(body.data?.flags).toBeUndefined();
	});

	it("gamble-check-enable はサーバー内チャンネルで本人設定を登録する", async () => {
		const rawBody = JSON.stringify({
			type: 2,
			data: { name: "gamble-check-enable" },
			guild_id: "555555555555555555",
			channel_id: "666666666666666666",
			member: { user: { id: targetUserId } },
		});

		const body = okBody(await yacchoBotInteractionRoute(buildEvent(rawBody)));

		expect(channelSettingRepository.save).toHaveBeenCalledWith({
			applicationKey: "yaccho-bot",
			settingKey: "play-check-reminder",
			guildId: "555555555555555555",
			channelId: "666666666666666666",
			userId: targetUserId,
		});
		expect(body.type).toBe(4);
		expect(body.data?.flags).toBe(64);
		expect(body.data?.content).toBe("うけたまかしこまつかまつり〜");
	});

	it("gamble-check-disable は本人設定だけを削除する", async () => {
		channelSettingRepository.deleteByGuildIdAndUserId.mockResolvedValue({
			guildId: "555555555555555555",
			channelId: "666666666666666666",
			userId: targetUserId,
		});
		const rawBody = JSON.stringify({
			type: 2,
			data: { name: "gamble-check-disable" },
			guild_id: "555555555555555555",
			member: { user: { id: targetUserId } },
		});

		const body = okBody(await yacchoBotInteractionRoute(buildEvent(rawBody)));

		expect(
			channelSettingRepository.deleteByGuildIdAndUserId,
		).toHaveBeenCalledWith({
			applicationKey: "yaccho-bot",
			settingKey: "play-check-reminder",
			guildId: "555555555555555555",
			userId: targetUserId,
		});
		expect(body.type).toBe(4);
		expect(body.data?.content).toBe("りょ～！またね～");
	});

	it("未対応のコマンドは対応外の ephemeral メッセージを返す", async () => {
		const rawBody = JSON.stringify({
			type: 2,
			data: { name: "unknown" },
			user: { id: targetUserId },
		});

		const body = okBody(await yacchoBotInteractionRoute(buildEvent(rawBody)));

		expect(body.type).toBe(4);
		expect(body.data?.flags).toBe(64);
	});

	it("未対応の interaction type は対応外の ephemeral メッセージを返す", async () => {
		const body = okBody(
			await yacchoBotInteractionRoute(buildEvent('{"type":99}')),
		);

		expect(body.type).toBe(4);
		expect(body.data?.flags).toBe(64);
	});

	it("autocomplete には空の候補一覧を返す", async () => {
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

	it("interaction body の JSON が不正なら 400 response を返す", async () => {
		const result = await yacchoBotInteractionRoute(buildEvent("not-a-json"));

		expect(result.statusCode).toBe(400);
		expect(JSON.parse(result.body)).toEqual({
			error: "リクエストが不正です。",
		});
	});
});
