// やること: Lambda 向け Chromium の Playwright 起動設定と起動処理を提供する
// やらないこと: Webpage からの値取得、metric 正規化、app 固有の定義変換を行う
import sparticuzChromium from "@sparticuz/chromium";
import {
	type Browser,
	type LaunchOptions,
	chromium as playwrightChromium,
} from "playwright-core";

/** Playwright 用の Chromium 起動設定を作る。 */
export const buildChromiumLaunchOptions = async (
	launchOptions: LaunchOptions = {},
): Promise<LaunchOptions> => ({
	...launchOptions,
	args: [...sparticuzChromium.args, ...(launchOptions.args ?? [])],
	executablePath:
		launchOptions.executablePath ?? (await sparticuzChromium.executablePath()),
	headless: launchOptions.headless ?? true,
});

/** Lambda 向け Chromium を Playwright で起動する。 */
export const launchChromium = async (
	launchOptions?: LaunchOptions,
): Promise<Browser> =>
	playwrightChromium.launch(await buildChromiumLaunchOptions(launchOptions));
