import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
	plugins: [vue(), tailwindcss()],
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	test: {
		environment: "jsdom",
		include: ["src/**/*.spec.ts"],
		coverage: {
			provider: "v8",
			include: ["src/**/*.{ts,vue}"],
			exclude: ["src/main.ts", "src/components/ui/**", "src/**/*.spec.ts"],
		},
	},
});
