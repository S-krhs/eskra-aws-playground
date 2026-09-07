import fsd from "@feature-sliced/steiger-plugin";
import { defineConfig } from "steiger";

// 設定は .js で書く。cosmiconfig の TypeScript loader が repo の TypeScript 7 に
// 未対応で、steiger.config.ts を置くと findConfigFile が無いと言って落ちる。
export default defineConfig([
	...fsd.configs.recommended,
	{
		rules: {
			// 画面が 1 つしかないため、どの slice も参照が 1 件になり全件が指摘される。
			// files で範囲を絞ると、その範囲のファイルが参照元として数えられなくなり
			// entities/media まで「参照 1 件」に見えるため、範囲を絞らず切る。
			// 2 つ目の画面を足したらこの無効化を外し、指摘が消えることを確かめる。
			"fsd/insignificant-slice": "off",
		},
	},
]);
