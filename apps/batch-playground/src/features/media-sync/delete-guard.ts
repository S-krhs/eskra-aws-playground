// In scope: 同期で消してよい件数かを判定する
// Out of scope: 削除そのもの、R2 の走査、DB への反映

// 一度に消える割合の上限。token の権限縮小や bucket 名の誤りで一覧が
// 空に近くなったとき、手で付けたタグごと消してしまうのを防ぐ
const MAX_DELETE_RATIO = 0.1;

// 少数の削除まで止めると通常の運用が回らないため、この件数までは通す
const DELETE_GUARD_FLOOR = 50;

/**
 * 削除の規模が異常なら中止する。
 * R2 のオブジェクトは残るが、行を消すとタグの紐付けも道連れになり、
 * 手で付けたタグは復元できないため、消す前に止める。
 */
export const assertDeletableSize = (
	deletableCount: number,
	knownCount: number,
): void => {
	if (deletableCount <= DELETE_GUARD_FLOOR) {
		return;
	}

	if (deletableCount <= knownCount * MAX_DELETE_RATIO) {
		return;
	}

	throw new Error(
		`登録済み ${knownCount} 件のうち ${deletableCount} 件が R2 に見つかりません。` +
			"token の権限か MEDIA_BUCKET の指定を確認してください。",
	);
};
