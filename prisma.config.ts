// In scope: Prisma CLI(generate / migrate)の設定。schema と migration の場所、
//           migrate が使う direct 接続の解決、ローカル .env の読込。
// Out of scope: runtime の DB 接続(repositories/db/client.ts が DATABASE_URL から解決する)。
import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// Prisma 7 の CLI は .env を自動読込しないため、ここで読み込む(CI / CD では env 直接指定)
if (existsSync(".env")) {
	process.loadEnvFile(".env");
}

export default defineConfig({
	schema: "migration/schema.prisma",
	migrations: {
		path: "migration/migrations",
	},
	// migrate 系コマンドは pooled を経由しない direct 接続を使う。
	// generate は datasource 不要のため、未設定でも失敗しないよう条件付きにする。
	...(process.env.DIRECT_DATABASE_URL
		? { datasource: { url: process.env.DIRECT_DATABASE_URL } }
		: {}),
});
