import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
	BackgroundOptions,
	CornerDotOptions,
	CornerSquareOptions,
	DotOptions,
	downloadQrCode,
	generateQrCode,
	SvgRenderOptions,
} from "../src";

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));
const OUTPUT_SVG = join(CURRENT_DIR, "test.svg");
const DEFAULT_TEXT = "Hello from App";

export const writeTestSvg = (text: string = DEFAULT_TEXT): string => {
	const dots: DotOptions = {
		hexColors: ["#092effff", "#2b003aff"],
		rotation: 45,
		style: "classyRounded",
	};
	const cornerSquares: CornerSquareOptions = {
		hexColors: ["#3c1053"],
		style: "dot",
	};
	const cornerDots: CornerDotOptions = {
		hexColors: ["#105348ff"],
		style: "square",
	};
	const background: BackgroundOptions = {
		hexColors: ["#ffffffff"],
	};

	const options: SvgRenderOptions = {
		size: 512,
		styling: {
			dotOptions: dots,
			cornerSquareOptions: cornerSquares,
			cornerDotOptions: cornerDots,
			backgroundOptions: background,
		},
	};

	const { svg } = generateQrCode(text, undefined, options);

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
