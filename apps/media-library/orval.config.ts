// In scope: how the frontend's API client is generated from the backend's OpenAPI document
// Out of scope: the routes themselves, how the screen calls the generated hooks
//
// The listing's cursor is two fields, which orval's useInfinite can't express (it takes one param
// name), so the infinite query is written by hand on top of the generated fetcher.
import { defineConfig } from "orval";

export default defineConfig({
	mediaLibrary: {
		input: {
			target: "../../shared-domains/media/library-api/openapi.json",
			// The thumbnail and the original both answer with a file the screen reaches through an
			// element's own attribute, so there is nothing for a generated fetcher to type. orval
			// selects endpoints by tag alone, which is why those routes carry one.
			filters: { mode: "exclude", tags: ["thumbnail", "file"] },
		},
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
