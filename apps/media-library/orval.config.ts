// In scope: how the frontend's API client is generated from the backend's OpenAPI document
// Out of scope: the routes themselves, how the screen calls the generated hooks
//
// The listing's cursor is two fields, which orval's useInfinite can't express (it takes one param
// name), so the infinite query is written by hand on top of the generated fetcher.
import { defineConfig } from "orval";

export default defineConfig({
	mediaLibrary: {
		input: "../../shared-domains/media/openapi.json",
		output: {
			target: "./frontend/src/shared/api/generated/media-library.ts",
			client: "react-query",
			httpClient: "fetch",
			baseUrl: "/api",
			clean: true,
			prettier: false,
		},
	},
});
