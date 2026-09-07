import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const here = (path: string): string => {
	return fileURLToPath(new URL(path, import.meta.url));
};

// backend の待ち受けポート。dev サーバからの /api はここへ中継する
const BACKEND_ORIGIN = "http://127.0.0.1:7420";

export default defineConfig({
	root: here("."),
	build: { outDir: here("dist"), emptyOutDir: true },
	resolve: {
		alias: {
			"@": here("src"),
			"@backend": here("../backend/src"),
		},
	},
	server: {
		port: 7421,
		proxy: { "/api": BACKEND_ORIGIN },
	},
	plugins: [
		react(),
		tailwindcss(),
		VitePWA({
			registerType: "autoUpdate",
			manifest: {
				name: "メディアライブラリ",
				short_name: "メディア",
				description: "R2 に置いた画像と動画を見て整理する",
				lang: "ja",
				start_url: "/",
				display: "standalone",
				background_color: "#101619",
				theme_color: "#0d6e7d",
				icons: [
					{ src: "/icon-192.png", sizes: "192x192", type: "image/png" },
					{ src: "/icon-512.png", sizes: "512x512", type: "image/png" },
					{
						src: "/icon-maskable-512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable",
					},
				],
			},
			workbox: {
				// 原本とサムネイルは backend が返す。ここで抱えると容量が読めなくなる
				navigateFallbackDenylist: [/^\/api\//],
				globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
			},
		}),
	],
});
