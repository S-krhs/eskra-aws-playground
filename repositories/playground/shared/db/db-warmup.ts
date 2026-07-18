// In scope: Prisma Client の初期化と軽量 query による DB 接続の確立
// Out of scope: Prisma Client の生成方法、個別テーブルの query、接続失敗時のリトライ
import { getPrismaClient } from "../../../db/client.js";

/**
 * Prisma Client を初期化し軽量 query で DB 接続を確立する。
 * Lambda init フェーズ(CPU ブースト中)で await すると、コールドスタート時の
 * 初回 query から接続確立コストを取り除ける。
 */
export const warmupDatabaseConnection = async (): Promise<void> => {
	await getPrismaClient().$queryRaw`SELECT 1`;
};
