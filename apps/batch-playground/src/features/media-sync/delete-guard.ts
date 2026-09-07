// In scope: judging whether a sync is allowed to delete this many rows
// Out of scope: the deletion itself, walking R2, writing to the DB

// The largest fraction that may be deleted at once.
// It stops a listing gone nearly empty — a narrowed token or a wrong bucket name — from wiping out rows and their tag links with them.
const MAX_DELETE_RATIO = 0.1;

// Up to this many deletions pass regardless of the fraction.
// Without it, ordinary operation would stall on every handful of deletions.
const DELETE_GUARD_FLOOR = 50;

/**
 * Throws on an abnormal number of deletions, so the caller abandons the delete.
 * Deleting a row leaves the R2 object but takes its tag links with it, and tags added by hand can't
 * be restored — so every delete goes through this first.
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
