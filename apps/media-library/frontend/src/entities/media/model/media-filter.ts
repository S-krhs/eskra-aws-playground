// In scope: 一覧を絞り込む条件の型
// Out of scope: 絞り込みの操作、一覧の取得、表示

/**
 * 一覧の絞り込み条件。項目を省くとその条件では絞らない。
 * 条件を出す feature と一覧を取る feature の両方が扱うため、entities に置く。
 */
export interface MediaFilter {
	logicalPath?: string;
	contentTypePrefix?: string;
}
