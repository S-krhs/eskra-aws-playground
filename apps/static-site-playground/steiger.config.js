import fsd from "@feature-sliced/steiger-plugin";
import { defineConfig } from "steiger";

// 設定は .js で書く。cosmiconfig の TypeScript loader が repo の TypeScript 7 に
// 未対応で、steiger.config.ts を置くと findConfigFile が無いと言って落ちる。
export default defineConfig([
	...fsd.configs.recommended,
	// src/pages/ は Astro のルーティングであって FSD の pages 層ではない。
	// index.astro を層の public API と誤検知し、ルートの単位を segment へ割れとも言う。
	{ ignores: ["./src/pages/**"] },
	{
		files: ["./src/features/**"],
		rules: {
			// feature を参照するのは Astro のページだけで、それは上で対象外にしている。
			// steiger からは参照ゼロに見えるため、features 層に限って無効化する。
			// widgets・entities では有効なままにし、切り出しすぎを検出させる。
			"fsd/insignificant-slice": "off",
		},
	},
]);
