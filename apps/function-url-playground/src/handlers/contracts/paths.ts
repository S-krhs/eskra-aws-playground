// In scope: the request paths the Function URL handler exposes
// Out of scope: mapping a path to a route, what each route does
export const paths = {
	yacchoBotInteraction: "/discord/interactions/yaccho-bot",
	kaguyaBotInteraction: "/discord/interactions/kaguya-bot",
	mediaSync: "/media/sync",
} as const;
