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

const applicationId = "888888888888888888";
const token = "interaction-token";

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
	sqs.sendMessages.mockReset();
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

	it("/inuihiroshiは宣言ジョブをenqueueし公開deferredでACKする", async () => {
		const response = await kaguyaBotInteractionRoute(
			buildEvent(
				JSON.stringify({
					type: 2,
					application_id: applicationId,
					token,
					data: { name: "inuihiroshi" },
					user: { id: "123" },
				}),
			),
		);

		expect(sqs.sendMessages).toHaveBeenCalledWith([
			{
				id: "interaction-job",
				body: {
					job: "kaguya-inuihiroshi-reply",
					applicationId,
					token,
				},
			},
		]);
		expect(JSON.parse(response.body)).toEqual({ type: 5 });
	});

	it("未対応commandにはephemeralメッセージを返しenqueueしない", async () => {
		const response = await kaguyaBotInteractionRoute(
			buildEvent(
				JSON.stringify({
					type: 2,
					application_id: applicationId,
					token,
					data: { name: "unknown" },
					user: { id: "123" },
				}),
			),
		);

		expect(sqs.sendMessages).not.toHaveBeenCalled();
		expect(JSON.parse(response.body)).toMatchObject({
			type: 4,
			data: { content: "この操作には対応していません。", flags: 64 },
		});
	});

	it("callbackを取り出せないinteractionは即時ephemeralで返す", async () => {
		const response = await kaguyaBotInteractionRoute(
			buildEvent(
				'{"type":2,"data":{"name":"inuihiroshi"},"user":{"id":"123"}}',
			),
		);

		expect(sqs.sendMessages).not.toHaveBeenCalled();
		expect(JSON.parse(response.body)).toMatchObject({
			type: 4,
			data: {
				content: "応答の準備に失敗しました。もう一度お試しください。",
				flags: 64,
			},
		});
	});

	it("enqueueに失敗したらdeferredではなく再試行を促すephemeralを返す", async () => {
		sqs.sendMessages.mockRejectedValue(
			new Error("SQS message の送信に失敗しました: interaction-job"),
		);

		const response = await kaguyaBotInteractionRoute(
			buildEvent(
				JSON.stringify({
					type: 2,
					application_id: applicationId,
					token,
					data: { name: "inuihiroshi" },
					user: { id: "123" },
				}),
			),
		);

		expect(response.statusCode).toBe(200);
		expect(JSON.parse(response.body)).toMatchObject({
			type: 4,
			data: {
				content: "処理の受け付けに失敗しました。もう一度お試しください。",
				flags: 64,
			},
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
