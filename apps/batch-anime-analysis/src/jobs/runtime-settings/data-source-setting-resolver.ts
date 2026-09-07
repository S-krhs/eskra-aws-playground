// In scope: the runtime settings the per-dataSource scrape job uses, and resolving them from the SST links
// Out of scope: interpreting the Lambda event, calling an external service, deciding which job runs
import { requireSecret } from "./require-linked-resource.js";

/** The runtime settings the per-dataSource scrape job uses. */
export interface DataSourceSettings {
	discordWebhookUrl: string;
}

/** Resolves the runtime settings the per-dataSource scrape job uses. */
export const getDataSourceSettings = (): DataSourceSettings => {
	return {
		discordWebhookUrl: requireSecret("AnimeAnalysisDiscordWebhook"),
	};
};
