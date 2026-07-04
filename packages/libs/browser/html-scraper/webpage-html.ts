// In scope: Webpage を取得して HTML を返す
// Out of scope: HTML 解析、metric 正規化、app 固有の定義変換を行う
import type {
	BrowserContextOptions,
	LaunchOptions,
	Page,
} from "playwright-core";

import { launchChromium } from "./chromium-browser.js";

/** page.goto に渡すナビゲーションオプション。 */
type PageGotoOptions = NonNullable<Parameters<Page["goto"]>[1]>;

/** ナビゲーションが無制限に待たないためのデフォルト設定。 */
const DEFAULT_GOTO_OPTIONS: PageGotoOptions = {
	waitUntil: "load",
	timeout: 30_000,
};

/** Webpage HTML 取得の実行オプション。 */
export interface WebpageHtmlOptions {
	launchOptions?: LaunchOptions;
	pageOptions?: BrowserContextOptions;
	gotoOptions?: PageGotoOptions;
}

/** Webpage を取得して HTML string を返す。 */
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
