import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { generateQrCode } from "../src";

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));
const OUTPUT_SVG = join(CURRENT_DIR, "test.svg");
const DEFAULT_TEXT = "Hello from App";

export const writeTestSvg = (text: string = DEFAULT_TEXT): string => {
	const { svg } = generateQrCode(text);

	mkdirSync(CURRENT_DIR, { recursive: true });
	writeFileSync(OUTPUT_SVG, svg, "utf8");

	return OUTPUT_SVG;
};

// Necessary to call the `writeTestSvg()` method
const isDirectExecution = (): boolean => {
	if (process.argv[1] === undefined) return false;
	const invoked = pathToFileURL(process.argv[1]).href;
	return import.meta.url === invoked;
};

if (isDirectExecution()) {
	writeTestSvg(DEFAULT_TEXT);
}
