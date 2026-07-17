// In scope: SST link した secret を Resource proxy 経由で型付きに参照できるようにする
// Out of scope: 実行時の値解決(sst/resource が担う)や、環境変数として渡す設定の型
import "sst/resource";

declare module "sst/resource" {
	interface Resource {
		UmaOneDrawTopicDiscordWebhook: { value: string };
		YacchoDiscordBotToken: { value: string };
		YacchoDiscordInteractionPublicKey: { value: string };
		YacchoDiscordApplicationId: { value: string };
		KaguyaDiscordBotToken: { value: string };
		KaguyaDiscordInteractionPublicKey: { value: string };
		KaguyaDiscordApplicationId: { value: string };
	}
}
