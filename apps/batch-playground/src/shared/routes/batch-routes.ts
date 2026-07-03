// In scope: Lambda バッチで受け付ける route 名を一元管理する
// Out of scope: route に対応する実行処理や外部連携の詳細を持つ

export const batchRoutes = {
	umaOneDrawTopic: "uma-one-draw-topic",
} as const;

export type BatchRoute = (typeof batchRoutes)[keyof typeof batchRoutes];

export const batchRouteList = Object.values(batchRoutes);
