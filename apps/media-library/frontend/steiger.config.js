import fsd from "@feature-sliced/steiger-plugin";
import { defineConfig } from "steiger";

// The config is .js: cosmiconfig's TypeScript loader doesn't support this repo's TypeScript 7,
// and a steiger.config.ts dies saying findConfigFile is missing.
export default defineConfig([
	...fsd.configs.recommended,
	{
		rules: {
			// With one screen, every slice has exactly one reference and all of them get flagged. Scoping
			// the rule with files doesn't help — files outside the scope stop counting as references, so
			// even entities/media looks like "one reference" — hence the unscoped off.
			// Once a second screen exists, remove this and confirm the warnings actually go away.
			"fsd/insignificant-slice": "off",
		},
	},
]);
