// In scope: Function URL handler が公開する request path の定義
// Out of scope: path と route の対応付け、各 route の処理内容
export const paths = {
	yacchoBotInteraction: "/discord/interactions/yaccho-bot",
	kaguyaBotInteraction: "/discord/interactions/kaguya-bot",
} as const;
