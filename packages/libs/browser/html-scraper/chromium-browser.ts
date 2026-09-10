// In scope: Playwright launch config and launching Chromium for Lambda
// Out of scope: fetching a page's content, metric normalization, app-specific definition conversion
import sparticuzChromium from "@sparticuz/chromium";
import {
	type Browser,
	type LaunchOptions,
	chromium as playwrightChromium,
} from "playwright-core";

export const buildChromiumLaunchOptions = async (
	launchOptions: LaunchOptions = {},
): Promise<LaunchOptions> => {
	return {
		...launchOptions,
		args: [...sparticuzChromium.args, ...(launchOptions.args ?? [])],
		executablePath:
			launchOptions.executablePath ??
			(await sparticuzChromium.executablePath()),
		headless: launchOptions.headless ?? true,
	};
};

export const launchChromium = async (
	launchOptions?: LaunchOptions,
): Promise<Browser> => {
	return playwrightChromium.launch(
		await buildChromiumLaunchOptions(launchOptions),
	);
};
