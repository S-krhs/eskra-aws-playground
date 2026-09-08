// In scope: creating the Prisma Client and resolving DATABASE_URL, reusing one instance across invocations
// Out of scope: per-table queries, exposing this to an app (deliberately outside the package exports)
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

let prisma: PrismaClient | undefined;

/** Resolved from the pooled connection string (DATABASE_URL); throws without attempting a connection when it is unset. */
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

	// Pinned to a single connection so one Lambda invocation never grows the pool
	const adapter = new PrismaPg({ connectionString, max: 1 });
	prisma = new PrismaClient({ adapter });
	return prisma;
};
