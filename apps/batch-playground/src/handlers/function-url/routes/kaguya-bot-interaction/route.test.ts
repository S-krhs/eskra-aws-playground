import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FunctionUrlEvent } from "@/handlers/function-url/schema.js";
import { paths } from "../../contracts/paths.js";
import { kaguyaBotInteractionRoute } from "./route.js";

const verifier = vi.hoisted(() => {
	return { verifyInteractionSignature: vi.fn() };
});

vi.mock(
	"@/external-protocols/discord-signature/verify-interaction-signature.js",
	() => {
		return verifier;
	},
);

vi.mock("sst/resource", () => {
	return {
		Resource: {
			KaguyaDiscordInteractionPublicKey: { value: "kaguya-public-key" },
		},
	};
});

const buildEvent = (body: string): FunctionUrlEvent => {
	return {
		rawPath: paths.kaguyaBotInteraction,
		headers: {
			"x-signature-ed25519": "signature",
			"x-signature-timestamp": "timestamp",
		},
		body,
		isBase64Encoded: false,
	};
};

beforeEach(() => {
	verifier.verifyInteractionSignature.mockReset();
	verifier.verifyInteractionSignature.mockReturnValue(true);
});

describe("kaguyaBotInteractionRoute", () => {
	it("PINGにはKaguyaのpublic keyで検証してPONGを返す", async () => {
		const response = await kaguyaBotInteractionRoute(buildEvent('{"type":1}'));

		expect(verifier.verifyInteractionSignature).toHaveBeenCalledWith({
			publicKey: "kaguya-public-key",
			signature: "signature",
			timestamp: "timestamp",
			rawBody: '{"type":1}',
		});
		expect(response.statusCode).toBe(200);
		expect(JSON.parse(response.body)).toEqual({ type: 1 });
	});

	it("/inuihiroshiには指定されたメッセージを返す", async () => {
		const response = await kaguyaBotInteractionRoute(
			buildEvent(
				'{"type":2,"data":{"name":"inuihiroshi"},"user":{"id":"123"}}',
			),
		);

		expect(JSON.parse(response.body)).toEqual({
			type: 4,
			data: {
				content: "自由だ～～～～！！！！！！！",
				allowed_mentions: { parse: [] },
			},
		});
	});

	it("未対応commandにはephemeralメッセージを返す", async () => {
		const response = await kaguyaBotInteractionRoute(
			buildEvent('{"type":2,"data":{"name":"unknown"},"user":{"id":"123"}}'),
		);

		expect(JSON.parse(response.body)).toMatchObject({
			type: 4,
			data: { flags: 64 },
		});
	});

	it("署名検証失敗は401、interaction不正は400を返す", async () => {
		verifier.verifyInteractionSignature.mockReturnValue(false);
		await expect(
			kaguyaBotInteractionRoute(buildEvent('{"type":1}')),
		).resolves.toMatchObject({ statusCode: 401 });

		await expect(
			kaguyaBotInteractionRoute(buildEvent("not-a-json")),
		).resolves.toMatchObject({ statusCode: 400 });
	});
});
