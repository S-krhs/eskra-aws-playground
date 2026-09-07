import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./frontend/src", import.meta.url)),
			"@backend": fileURLToPath(new URL("./backend/src", import.meta.url)),
		},
	},
});
