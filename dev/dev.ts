import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
	BackgroundOptions,
	CornerDotOptions,
	CornerSquareOptions,
	DotOptions,
	generateQrCode,
	ImageOptions,
	SvgRenderOptions,
} from "../src";

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));
const OUTPUT_SVG = join(CURRENT_DIR, "test.svg");
const TEST_PNG =
	"data:image/avif;base64,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";
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

	const image: ImageOptions = {
		source: TEST_PNG,
		shape: "circle",
		hideBackground: true,
		backgroundColor: "#41b72dab",
	};

	const renderOptions: SvgRenderOptions = {
		size: 512,
		styling: {
			imageOptions: image,
			dotOptions: dots,
			cornerSquareOptions: cornerSquares,
			cornerDotOptions: cornerDots,
			backgroundOptions: background,
		},
	};

	const { svg } = generateQrCode(text, undefined, renderOptions);

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
