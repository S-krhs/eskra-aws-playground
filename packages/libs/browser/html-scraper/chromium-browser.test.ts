import { beforeEach, describe, expect, it, vi } from "vitest";

const chromium = vi.hoisted(() => {
	return {
		executablePath: vi.fn(async () => {
			return "/tmp/chromium";
		}),
	};
});

vi.mock("@sparticuz/chromium", () => {
	return {
		default: {
			args: ["--lambda-arg"],
			executablePath: chromium.executablePath,
		},
	};
});

import { buildChromiumLaunchOptions } from "./chromium-browser.js";

describe("buildChromiumLaunchOptions", () => {
	beforeEach(() => {
		chromium.executablePath.mockClear();
	});

	it("Lambda 向け Chromium の起動設定を作る", async () => {
		const options = await buildChromiumLaunchOptions({
			args: ["--app-arg"],
		});

		expect(options).toMatchObject({
			args: ["--lambda-arg", "--app-arg"],
			executablePath: "/tmp/chromium",
			headless: true,
		});
	});

	it("呼び出し側の executablePath と headless を優先する", async () => {
		const options = await buildChromiumLaunchOptions({
			executablePath: "/custom/chromium",
			headless: false,
		});

		expect(chromium.executablePath).not.toHaveBeenCalled();
		expect(options).toMatchObject({
			executablePath: "/custom/chromium",
			headless: false,
		});
	});
});
