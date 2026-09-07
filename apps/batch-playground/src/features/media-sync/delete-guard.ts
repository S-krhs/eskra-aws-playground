// In scope: 同期で消してよい件数かを判定する
// Out of scope: 削除そのもの、R2 の走査、DB への反映

// 一度に削除できる件数の割合の上限。
// token の権限縮小や bucket 名の誤りで一覧がほぼ空になった場合に、行を大量に削除してタグの紐付けまで失うことを防ぐ。
const MAX_DELETE_RATIO = 0.1;

// 削除件数がこの値以下なら、割合に関わらず許可する下限。
// 少数の削除まで止めてしまうと通常運用が回らなくなるため設ける。
const DELETE_GUARD_FLOOR = 50;

/**
 * 削除件数が異常に多い場合はエラーを投げ、呼び出し元に削除を中止させる。
 * 行を削除すると R2 のオブジェクトは残るがタグの紐付けは一緒に削除され、
 * 手で付けたタグは復元できなくなるため、削除の前に必ずこの関数を通す。
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
