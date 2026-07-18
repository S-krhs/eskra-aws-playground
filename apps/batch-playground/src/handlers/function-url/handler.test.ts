import { beforeEach, describe, expect, it, vi } from "vitest";

import { paths } from "./contracts/paths.js";
import { handler } from "./handler.js";

const route = vi.hoisted(() => {
	return {
		yacchoBotInteractionRoute: vi.fn(),
		kaguyaBotInteractionRoute: vi.fn(),
	};
});

vi.mock(
	"@eskra-aws-playground/repositories/playground/shared/db/db-warmup.js",
	() => {
		return { warmupDatabaseConnection: vi.fn().mockResolvedValue(undefined) };
	},
);
vi.mock("./routes/kaguya-bot-interaction/route.js", () => {
	return { kaguyaBotInteractionRoute: route.kaguyaBotInteractionRoute };
});
vi.mock("./routes/yaccho-bot-interaction/route.js", () => {
	return { yacchoBotInteractionRoute: route.yacchoBotInteractionRoute };
});

const buildEvent = (rawPath: string) => {
	return {
		rawPath,
		headers: { "x-signature-ed25519": "abc" },
		body: '{"type":1}',
		isBase64Encoded: false,
	};
};

beforeEach(() => {
	route.yacchoBotInteractionRoute.mockReset();
	route.kaguyaBotInteractionRoute.mockReset();
});

describe("handler", () => {
	it("path に対応する route の HTTP response をそのまま返す", async () => {
		route.yacchoBotInteractionRoute.mockResolvedValue({
			statusCode: 200,
			headers: { "Content-Type": "application/json" },
			body: '{"type":1}',
		});
		const event = buildEvent(paths.yacchoBotInteraction);

		const response = await handler(event);

		expect(route.yacchoBotInteractionRoute).toHaveBeenCalledWith(event);
		expect(response).toEqual({
			statusCode: 200,
			headers: { "Content-Type": "application/json" },
			body: '{"type":1}',
		});
	});

	it("Kaguya Bot の path を専用 route へ委譲する", async () => {
		route.kaguyaBotInteractionRoute.mockResolvedValue({
			statusCode: 200,
			headers: { "Content-Type": "application/json" },
			body: '{"type":1}',
		});
		const event = buildEvent(paths.kaguyaBotInteraction);

		await handler(event);

		expect(route.kaguyaBotInteractionRoute).toHaveBeenCalledWith(event);
		expect(route.yacchoBotInteractionRoute).not.toHaveBeenCalled();
	});

	it("route のエラー response をそのまま返す", async () => {
		route.yacchoBotInteractionRoute.mockResolvedValue({
			statusCode: 401,
			headers: { "Content-Type": "application/json" },
			body: '{"error":"署名が不正です。"}',
		});

		const response = await handler(buildEvent(paths.yacchoBotInteraction));

		expect(response.statusCode).toBe(401);
	});

	it("envelope 形式が不正なら 400 を返し route を呼ばない", async () => {
		const response = await handler({ headers: {} });

		expect(response.statusCode).toBe(400);
		expect(route.yacchoBotInteractionRoute).not.toHaveBeenCalled();
		expect(route.kaguyaBotInteractionRoute).not.toHaveBeenCalled();
	});

	it("対応しないパスは 404 を返し route を呼ばない", async () => {
		const response = await handler({ rawPath: "/unknown", headers: {} });

		expect(response.statusCode).toBe(404);
		expect(route.yacchoBotInteractionRoute).not.toHaveBeenCalled();
		expect(route.kaguyaBotInteractionRoute).not.toHaveBeenCalled();
	});
});
