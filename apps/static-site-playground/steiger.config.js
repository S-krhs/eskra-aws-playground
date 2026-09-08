import fsd from "@feature-sliced/steiger-plugin";
import { defineConfig } from "steiger";

// The config is .js: cosmiconfig's TypeScript loader doesn't support this repo's TypeScript 7,
// and a steiger.config.ts dies saying findConfigFile is missing.
export default defineConfig([
	...fsd.configs.recommended,
	// src/pages/ is Astro routing, not the FSD pages layer. Otherwise index.astro gets flagged as
	// that layer's public API, and each route is told to split into segments.
	{ ignores: ["./src/pages/**"] },
	{
		files: ["./src/features/**"],
		rules: {
			// Only Astro pages reference this feature, and those are excluded above, so steiger sees zero
			// references. It is disabled for the features layer alone, and stays on for widgets and
			// entities to keep catching over-splitting.
			"fsd/insignificant-slice": "off",
		},
	},
]);
