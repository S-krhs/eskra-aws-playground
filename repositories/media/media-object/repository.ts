// In scope: MediaObject の登録・key の付け替え・削除と、一覧および単体の取得
// Out of scope: R2 への読み書き、key の組み立て、タグとフォルダの操作、サムネイル生成
import { getPrismaClient } from "../../db/client.js";
import type {
	FindMediaObjectPageInput,
	InsertMediaObjectInput,
	MediaObject,
	MediaObjectCursor,
	MediaObjectKey,
	MediaObjectPage,
	RelocateMediaObjectInput,
} from "./types.js";

interface MediaObjectRow {
	id: string;
	objectKey: string;
	logicalPath: string;
	fileName: string;
	contentType: string;
	byteSize: bigint;
	etag: string;
	width: number | null;
	height: number | null;
	durationMs: number | null;
	thumbnailKey: string | null;
	uploadedAt: Date;
	syncedAt: Date;
	trashedAt: Date | null;
}

const toMediaObject = (row: MediaObjectRow): MediaObject => {
	return {
		id: row.id,
		objectKey: row.objectKey,
		logicalPath: row.logicalPath,
		fileName: row.fileName,
		contentType: row.contentType,
		byteSize: Number(row.byteSize),
		etag: row.etag,
		width: row.width ?? undefined,
		height: row.height ?? undefined,
		durationMs: row.durationMs ?? undefined,
		thumbnailKey: row.thumbnailKey ?? undefined,
		uploadedAt: row.uploadedAt,
		syncedAt: row.syncedAt,
		trashedAt: row.trashedAt ?? undefined,
	};
};

// (uploadedAt, id) の組で位置を決める。Prisma は組での比較を書けないため OR に展開する
const toCursorFilter = (cursor: MediaObjectCursor) => {
	return {
		OR: [
			{ uploadedAt: { lt: cursor.uploadedAt } },
			{ uploadedAt: cursor.uploadedAt, id: { lt: cursor.id } },
		],
	};
};

/** メディアの永続化操作。 */
export const mediaObjectRepository = {
	/**
	 * 登録済みの id と key を全件返す。
	 * 同期が R2 の一覧と突き合わせるための射影で、本文の列は読まない。
	 */
	findAllKeys: async (): Promise<MediaObjectKey[]> => {
		const prisma = getPrismaClient();

		return await prisma.mediaObject.findMany({
			select: { id: true, objectKey: true },
		});
	},

	/** id で 1 件取得する。ゴミ箱に入れたものも返す。 */
	findById: async (id: string): Promise<MediaObject | undefined> => {
		const prisma = getPrismaClient();
		const row = await prisma.mediaObject.findUnique({ where: { id } });

		return row ? toMediaObject(row) : undefined;
	},

	/** 新着順で 1 ページ取得する。ゴミ箱に入れたものは除外する。 */
	findPage: async (
		input: FindMediaObjectPageInput,
	): Promise<MediaObjectPage> => {
		const prisma = getPrismaClient();
		const rows = await prisma.mediaObject.findMany({
			where: {
				trashedAt: null,
				logicalPath: input.logicalPath,
				contentType: input.contentTypePrefix
					? { startsWith: input.contentTypePrefix }
					: undefined,
				...(input.cursor ? toCursorFilter(input.cursor) : {}),
			},
			orderBy: [{ uploadedAt: "desc" }, { id: "desc" }],
			// 次ページの有無を追加の COUNT なしで判定するため 1 件多く読む
			take: input.limit + 1,
		});

		const objects = rows.slice(0, input.limit).map(toMediaObject);
		const last = objects.at(-1);

		return {
			objects,
			nextCursor:
				rows.length > input.limit && last
					? { uploadedAt: last.uploadedAt, id: last.id }
					: undefined,
		};
	},

	/** 新規に見つかったメディアをまとめて登録する。既に登録済みの id は無視する。 */
	insertMany: async (inputs: InsertMediaObjectInput[]): Promise<number> => {
		if (inputs.length === 0) {
			return 0;
		}

		const prisma = getPrismaClient();
		const result = await prisma.mediaObject.createMany({
			data: inputs.map((input) => {
				return { ...input, byteSize: BigInt(input.byteSize) };
			}),
			skipDuplicates: true,
		});

		return result.count;
	},

	/** 外部で移動されたメディアの key を付け替える。 */
	relocateMany: async (inputs: RelocateMediaObjectInput[]): Promise<number> => {
		if (inputs.length === 0) {
			return 0;
		}

		const prisma = getPrismaClient();
		const updates = inputs.map((input) => {
			return prisma.mediaObject.update({
				where: { id: input.id },
				data: {
					objectKey: input.objectKey,
					logicalPath: input.logicalPath,
					syncedAt: input.syncedAt,
				},
			});
		});
		const updated = await prisma.$transaction(updates);

		return updated.length;
	},

	/** R2 に依然として存在していたメディアの確認時刻を更新する。 */
	touchMany: async (ids: string[], syncedAt: Date): Promise<number> => {
		if (ids.length === 0) {
			return 0;
		}

		const prisma = getPrismaClient();
		const result = await prisma.mediaObject.updateMany({
			where: { id: { in: ids } },
			data: { syncedAt },
		});

		return result.count;
	},

	/** R2 から消えたメディアの行を削除する。タグの紐付けも併せて消える。 */
	deleteByIds: async (ids: string[]): Promise<number> => {
		if (ids.length === 0) {
			return 0;
		}

		const prisma = getPrismaClient();
		const result = await prisma.mediaObject.deleteMany({
			where: { id: { in: ids } },
		});

		return result.count;
	},
};
