// In scope: making SST-linked secrets typed when read through the Resource proxy
// Out of scope: resolving the value at runtime (sst/resource does that), and the types of settings passed as env vars
import "sst/resource";

declare module "sst/resource" {
	interface Resource {
		YacchoDiscordInteractionPublicKey: { value: string };
		KaguyaDiscordInteractionPublicKey: { value: string };
		PlaygroundInteractionQueue: { url: string };
		YacchoDiscordBotToken: { value: string };
		YacchoDiscordApplicationId: { value: string };
		KaguyaDiscordBotToken: { value: string };
		KaguyaDiscordApplicationId: { value: string };
		MediaSyncToken: { value: string };
	}
}
