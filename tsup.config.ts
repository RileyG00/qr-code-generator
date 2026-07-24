import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	target: "node22",
	platform: "neutral",
	outDir: "dist",
	dts: true,
	sourcemap: true,
	clean: true,
	treeshake: true,
});
