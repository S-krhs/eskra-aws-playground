// In scope: making SST-linked secrets typed when read through the Resource proxy
// Out of scope: resolving the value at runtime (sst/resource does that), and the types of settings passed as env vars
import "sst/resource";

declare module "sst/resource" {
	interface Resource {
		MediaThumbnailQueue: { url: string };
		MediaAdoptQueue: { url: string };
		UmaOneDrawTopicDiscordWebhook: { value: string };
		YacchoDiscordBotToken: { value: string };
	}
}
