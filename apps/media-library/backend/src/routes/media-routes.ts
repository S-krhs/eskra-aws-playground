// In scope: メディア一覧とサムネイル配信の HTTP route
// Out of scope: DB の query 組み立て、キャッシュファイルの読み書き、R2 の wire 解釈
import { r2ObjectStore } from "@eskra-aws-playground/integration-r2/r2-object-store.js";
import { mediaObjectRepository } from "@eskra-aws-playground/repositories/media/media-object/repository.js";
import { Hono } from "hono";
import { z } from "zod";
import {
	readCachedThumbnail,
	writeCachedThumbnail,
} from "../features/thumbnail-cache/thumbnail-cache.js";
import type { LibraryContext } from "../shared/library-context.js";
import { toInvalidQueryMessage } from "./intermediate-models/invalid-query.js";
import { toMediaView } from "./intermediate-models/media-view.js";

// 仮想スクロールが継ぎ足す単位。増やすと初回の描画が重く、減らすと継ぎ足しが目立つ
const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

// サムネイルは中身が変われば別の id になるため、ブラウザにも持たせてよい
const THUMBNAIL_CACHE_CONTROL = "private, max-age=86400";

const listQuerySchema = z
	.object({
		logicalPath: z.string().min(1).optional(),
		contentTypePrefix: z.string().min(1).optional(),
		limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
		cursorUploadedAt: z.iso.datetime().optional(),
		cursorId: z.uuid().optional(),
	})
	.refine(
		(query) => {
			return (
				(query.cursorUploadedAt === undefined) ===
				(query.cursorId === undefined)
			);
		},
		{ message: "cursorUploadedAt と cursorId は両方を渡してください" },
	);

const mediaIdSchema = z.uuid();

/** 一覧とサムネイルの route を組み立てる。 */
export const createMediaRoutes = (context: LibraryContext) => {
	return new Hono()
		.get("/", async (c) => {
			const query = listQuerySchema.safeParse(c.req.query());

			if (!query.success) {
				return c.json({ message: toInvalidQueryMessage(query.error) }, 400);
			}

			const page = await mediaObjectRepository.findPage({
				logicalPath: query.data.logicalPath,
				contentTypePrefix: query.data.contentTypePrefix,
				limit: query.data.limit,
				cursor:
					query.data.cursorUploadedAt && query.data.cursorId
						? {
								uploadedAt: new Date(query.data.cursorUploadedAt),
								id: query.data.cursorId,
							}
						: undefined,
			});

			return c.json({
				objects: page.objects.map(toMediaView),
				nextCursor: page.nextCursor
					? {
							uploadedAt: page.nextCursor.uploadedAt.toISOString(),
							id: page.nextCursor.id,
						}
					: null,
			});
		})
		.get("/:id/thumbnail", async (c) => {
			// そのままファイル名に使うため、UUID であることを先に確かめる
			const id = mediaIdSchema.safeParse(c.req.param("id"));

			if (!id.success) {
				return c.json({ message: "id が UUID ではありません" }, 400);
			}

			const { settings, r2 } = context;
			const cached = await readCachedThumbnail(
				settings.thumbnailCacheDir,
				id.data,
			);

			if (cached) {
				return c.body(new Uint8Array(cached), 200, {
					"content-type": "image/webp",
					"cache-control": THUMBNAIL_CACHE_CONTROL,
				});
			}

			const media = await mediaObjectRepository.findById(id.data);

			if (!media?.thumbnailKey) {
				// 同期が生成を終えるまでは存在しない。画面は代替の表示へ落とす
				return c.json({ message: "サムネイルがまだありません" }, 404);
			}

			const object = await r2ObjectStore.get(r2, {
				bucket: settings.bucket,
				key: media.thumbnailKey,
			});
			const body = new Uint8Array(
				await new Response(object.body).arrayBuffer(),
			);

			await writeCachedThumbnail(settings.thumbnailCacheDir, id.data, body);

			return c.body(body, 200, {
				"content-type": object.contentType,
				"cache-control": THUMBNAIL_CACHE_CONTROL,
			});
		});
};
