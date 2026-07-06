// In scope: Prisma Client の生成と DATABASE_URL の解決。実行間で 1 インスタンスを再利用する。
// Out of scope: 個別テーブルの query、app への公開(package exports の対象外)。
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

let prisma: PrismaClient | undefined;

/**
 * module スコープで再利用する Prisma Client を返す。
 * 接続先は pooled 接続文字列(DATABASE_URL)から解決し、未設定なら接続を試みず throw する。
 */
export const getPrismaClient = (): PrismaClient => {
	if (prisma) {
		return prisma;
	}

	const connectionString = process.env.DATABASE_URL;
	if (!connectionString) {
		throw new Error(
			"DATABASE_URL が設定されていません。Neon branch の pooled 接続文字列を設定してください。",
		);
	}

	// Lambda 実行ごとの接続数を増やさないため pool を 1 接続に固定する
	const adapter = new PrismaPg({ connectionString, max: 1 });
	prisma = new PrismaClient({ adapter });
	return prisma;
};
