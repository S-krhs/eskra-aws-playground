import { beforeEach, describe, expect, it, vi } from "vitest";

import { paths } from "./contracts/paths.js";
import { handler } from "./handler.js";

const route = vi.hoisted(() => {
	return {
		yacchoBotInteractionRoute: vi.fn(),
		kaguyaBotInteractionRoute: vi.fn(),
		mediaSyncRoute: vi.fn(),
	};
});

vi.mock("./routes/kaguya-bot-interaction/route.js", () => {
	return { kaguyaBotInteractionRoute: route.kaguyaBotInteractionRoute };
});
vi.mock("./routes/yaccho-bot-interaction/route.js", () => {
	return { yacchoBotInteractionRoute: route.yacchoBotInteractionRoute };
});
vi.mock("./routes/media-sync/route.js", () => {
	return { mediaSyncRoute: route.mediaSyncRoute };
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
	route.mediaSyncRoute.mockReset();
});

describe("handler", () => {
	it("returns the HTTP response of the route matching the path, untouched", async () => {
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

	it("delegates the Kaguya Bot path to its own route", async () => {
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

	it("delegates the media sync path to its own route", async () => {
		route.mediaSyncRoute.mockResolvedValue({
			statusCode: 202,
			headers: { "Content-Type": "application/json" },
			body: '{"message":"同期の起動を受け付けました。"}',
		});
		const event = buildEvent(paths.mediaSync);

		await handler(event);

		expect(route.mediaSyncRoute).toHaveBeenCalledWith(event);
		expect(route.yacchoBotInteractionRoute).not.toHaveBeenCalled();
	});

	it("returns a route's error response untouched", async () => {
		route.yacchoBotInteractionRoute.mockResolvedValue({
			statusCode: 401,
			headers: { "Content-Type": "application/json" },
			body: '{"error":"署名が不正です。"}',
		});

		const response = await handler(buildEvent(paths.yacchoBotInteraction));

		expect(response.statusCode).toBe(401);
	});

	it("returns 400 without calling a route when the envelope is malformed", async () => {
		const response = await handler({ headers: {} });

		expect(response.statusCode).toBe(400);
		expect(route.yacchoBotInteractionRoute).not.toHaveBeenCalled();
		expect(route.kaguyaBotInteractionRoute).not.toHaveBeenCalled();
	});

	it("returns 404 without calling a route for an unhandled path", async () => {
		const response = await handler({ rawPath: "/unknown", headers: {} });

		expect(response.statusCode).toBe(404);
		expect(route.yacchoBotInteractionRoute).not.toHaveBeenCalled();
		expect(route.kaguyaBotInteractionRoute).not.toHaveBeenCalled();
	});
});
