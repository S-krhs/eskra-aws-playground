// In scope: fetching a webpage and returning its HTML
// Out of scope: HTML parsing, metric normalization, app-specific definition conversion
import type {
	BrowserContextOptions,
	LaunchOptions,
	Page,
} from "playwright-core";

import { launchChromium } from "./chromium-browser.js";

type PageGotoOptions = NonNullable<Parameters<Page["goto"]>[1]>;

/** Caps navigation so it doesn't wait indefinitely. */
const DEFAULT_GOTO_OPTIONS: PageGotoOptions = {
	waitUntil: "load",
	timeout: 30_000,
};

export interface WebpageHtmlOptions {
	launchOptions?: LaunchOptions;
	pageOptions?: BrowserContextOptions;
	gotoOptions?: PageGotoOptions;
}

export const fetchWebpageHtml = async (
	url: string,
	options: WebpageHtmlOptions = {},
): Promise<string> => {
	const browser = await launchChromium(options.launchOptions);

	try {
		const page = await browser.newPage(options.pageOptions);
		await page.goto(url, { ...DEFAULT_GOTO_OPTIONS, ...options.gotoOptions });
		const content = await page.content();
		return content;
	} finally {
		await browser.close();
	}
};
