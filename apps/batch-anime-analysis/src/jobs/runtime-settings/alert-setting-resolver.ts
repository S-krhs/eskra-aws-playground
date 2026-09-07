// In scope: the runtime settings the alert notification job uses, and resolving them from the SST links
// Out of scope: interpreting the Lambda event, calling an external service, deciding which job runs
import { requireSecret } from "./require-linked-resource.js";

export interface AlertSettings {
	discordWebhookUrl: string;
}

export const getAlertSettings = (): AlertSettings => {
	return {
		discordWebhookUrl: requireSecret("AlertDiscordWebhook"),
	};
};
