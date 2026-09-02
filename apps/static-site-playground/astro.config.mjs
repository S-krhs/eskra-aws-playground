import react from "@astrojs/react";
import { defineConfig } from "astro/config";

export default defineConfig({
	site: "https://sasahara.uk",
	integrations: [react()],
});
