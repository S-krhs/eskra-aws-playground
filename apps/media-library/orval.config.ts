// In scope: how the frontend's API client is generated from the backend's OpenAPI document
// Out of scope: the routes themselves, how the screen calls the generated hooks
//
// The listing's cursor is two fields, which orval's useInfinite can't express (it takes one param
// name), so the infinite query is written by hand on top of the generated fetcher.
//
// Every endpoint is generated, including the two that answer with a file. Their fetcher and hook go
// unused — the screen reaches those through an <img>/<video>/<a> — but the URL builder generated
// beside them is what keeps their paths from being written a second time by hand.
import { defineConfig } from "orval";

export default defineConfig({
	mediaLibrary: {
		input: {
			target: "../../shared-domains/media/library-api/openapi.json",
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
