// In scope: the Prisma CLI's settings — where the schema and migrations live, the direct connection migrate uses, and loading a local .env
// Out of scope: the runtime DB connection (repositories/client/prisma.ts resolves that from DATABASE_URL)
import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// Prisma 7's CLI doesn't read .env by itself, so it is loaded here (CI/CD passes the env directly)
if (existsSync(".env")) {
	process.loadEnvFile(".env");
}

export default defineConfig({
	schema: "migration/schema.prisma",
	migrations: {
		path: "migration/migrations",
	},
	// The migrate commands need a direct connection rather than the pooled one. generate needs no
	// datasource at all, so this stays conditional and an unset variable isn't a failure
	...(process.env.DIRECT_DATABASE_URL
		? { datasource: { url: process.env.DIRECT_DATABASE_URL } }
		: {}),
});
