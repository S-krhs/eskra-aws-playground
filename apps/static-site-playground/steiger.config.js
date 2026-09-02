import fsd from "@feature-sliced/steiger-plugin";
import { defineConfig } from "steiger";

// 設定は .js で書く。cosmiconfig の TypeScript loader が repo の TypeScript 7 に
// 未対応で、steiger.config.ts を置くと findConfigFile が無いと言って落ちる。
export default defineConfig([
	...fsd.configs.recommended,
	// src/pages/ は Astro のルーティングであって FSD の pages 層ではない。
	// index.astro を層の public API と誤検知するため対象から外す。
	{ ignores: ["./src/pages/**"] },
	{
		rules: {
			// 共通ルールでバレルファイルを禁止しているため slice の index.ts は作らず、
			// segment のファイルを直接 import する。
			"fsd/public-api": "off",
			"fsd/no-public-api-sidestep": "off",
			// 小さいツールなので slice の参照元は widget 1 つに寄る。
			// 層で分けること自体が目的なので統合の提案は受け取らない。
			"fsd/insignificant-slice": "off",
		},
	},
]);
