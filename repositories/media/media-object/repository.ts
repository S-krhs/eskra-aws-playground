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
	SetMediaThumbnailInput,
	ThumbnaillessMediaObject,
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

// 10 万件規模の同期で 1 文が巨大にならないよう、一括操作はこの単位へ割る
const BULK_CHUNK_SIZE = 1_000;

const toChunks = <T>(items: T[]): T[][] => {
	const chunks: T[][] = [];

	for (let offset = 0; offset < items.length; offset += BULK_CHUNK_SIZE) {
		chunks.push(items.slice(offset, offset + BULK_CHUNK_SIZE));
	}

	return chunks;
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

	/**
	 * サムネイルが未生成のメディアを返す。
	 * 1 回の同期で積む量を抑えるため、上限を呼び出し側が決める。
	 */
	findWithoutThumbnail: async (
		limit: number,
	): Promise<ThumbnaillessMediaObject[]> => {
		const prisma = getPrismaClient();

		return await prisma.mediaObject.findMany({
			where: { thumbnailKey: null, trashedAt: null },
			orderBy: [{ uploadedAt: "desc" }],
			take: limit,
			select: { id: true, objectKey: true },
		});
	},

	/** 生成したサムネイルの所在と、併せて読めた寸法・尺を記録する。 */
	setThumbnail: async (input: SetMediaThumbnailInput): Promise<void> => {
		const prisma = getPrismaClient();
		const { id, ...values } = input;

		await prisma.mediaObject.update({ where: { id }, data: values });
	},

	/** 新規に見つかったメディアをまとめて登録する。既に登録済みの id は無視する。 */
	insertMany: async (inputs: InsertMediaObjectInput[]): Promise<number> => {
		if (inputs.length === 0) {
			return 0;
		}

		const prisma = getPrismaClient();
		let inserted = 0;

		for (const chunk of toChunks(inputs)) {
			const result = await prisma.mediaObject.createMany({
				data: chunk.map((input) => {
					return { ...input, byteSize: BigInt(input.byteSize) };
				}),
				skipDuplicates: true,
			});

			inserted += result.count;
		}

		return inserted;
	},

	/** 外部で移動されたメディアの key を付け替える。 */
	relocateMany: async (inputs: RelocateMediaObjectInput[]): Promise<number> => {
		if (inputs.length === 0) {
			return 0;
		}

		const prisma = getPrismaClient();
		let updated = 0;

		for (const chunk of toChunks(inputs)) {
			const updates = chunk.map((input) => {
				return prisma.mediaObject.update({
					where: { id: input.id },
					data: {
						objectKey: input.objectKey,
						logicalPath: input.logicalPath,
						syncedAt: input.syncedAt,
					},
				});
			});

			updated += (await prisma.$transaction(updates)).length;
		}

		return updated;
	},

	/** R2 に依然として存在していたメディアの確認時刻を更新する。 */
	touchMany: async (ids: string[], syncedAt: Date): Promise<number> => {
		if (ids.length === 0) {
			return 0;
		}

		const prisma = getPrismaClient();
		let touched = 0;

		for (const chunk of toChunks(ids)) {
			const result = await prisma.mediaObject.updateMany({
				where: { id: { in: chunk } },
				data: { syncedAt },
			});

			touched += result.count;
		}

		return touched;
	},

	/** R2 から消えたメディアの行を削除する。タグの紐付けも併せて消える。 */
	deleteByIds: async (ids: string[]): Promise<number> => {
		if (ids.length === 0) {
			return 0;
		}

		const prisma = getPrismaClient();
		let deleted = 0;

		for (const chunk of toChunks(ids)) {
			const result = await prisma.mediaObject.deleteMany({
				where: { id: { in: chunk } },
			});

			deleted += result.count;
		}

		return deleted;
	},
};
