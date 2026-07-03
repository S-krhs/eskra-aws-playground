// やること: Webpage を取得して HTML を返す
// やらないこと: HTML 解析、metric 正規化、app 固有の定義変換を行う
import type { BrowserContextOptions, LaunchOptions } from "playwright-core";

import { launchChromium } from "./chromium-browser.js";

/** Webpage HTML 取得の実行オプション。 */
export interface WebpageHtmlOptions {
	launchOptions?: LaunchOptions;
	pageOptions?: BrowserContextOptions;
}

/** Webpage を取得して HTML string を返す。 */
export const fetchWebpageHtml = async (
	url: string,
	options: WebpageHtmlOptions = {},
): Promise<string> => {
	const browser = await launchChromium(options.launchOptions);

	try {
		const page = await browser.newPage(options.pageOptions);
		await page.goto(url);
		const content = await page.content();
		return content;
	} finally {
		await browser.close();
	}
};
