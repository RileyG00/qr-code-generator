import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { encodeToSvg } from "../src";

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));
const OUTPUT_SVG = join(CURRENT_DIR, "test.svg");
const DEFAULT_TEXT = "Hello from App";

export const writeHelloSvg = (text: string = DEFAULT_TEXT): string => {
	const svg = encodeToSvg(text);

	mkdirSync(CURRENT_DIR, { recursive: true });
	writeFileSync(OUTPUT_SVG, svg, "utf8");

	return OUTPUT_SVG;
};

const isDirectExecution = (): boolean => {
	if (process.argv[1] === undefined) return false;
	const invoked = pathToFileURL(process.argv[1]).href;
	return import.meta.url === invoked;
};

const parseTextArgument = (): string | undefined => {
	const directEnv = process.env.TEXT ?? process.env.text;
	if (hasValue(directEnv)) {
		return normalizeWindowsEscapes(directEnv);
	}

	const npmText = process.env.npm_config_text;
	if (hasValue(npmText) && npmText !== "true" && npmText !== "false") {
		return normalizeWindowsEscapes(npmText);
	}

	const textFromArgv = findTextFlag(process.argv.slice(2));
	if (textFromArgv) return textFromArgv;

	if (npmText === "true") {
		const fallback = process.argv.slice(2).join(" ").trim();
		if (fallback.length > 0) {
			return normalizeWindowsEscapes(fallback);
		}
	}

	const npmArgv = process.env.npm_config_argv;
	if (!npmArgv) return undefined;

	try {
		const parsed = JSON.parse(npmArgv);
		if (Array.isArray(parsed?.remain)) {
			return findTextFlag(parsed.remain as string[]);
		}
	} catch {
		// ignore parse issues and fall through
	}

	return undefined;
};

const findTextFlag = (args: string[]): string | undefined => {
	for (let i = 0; i < args.length; i++) {
		const token = args[i];
		if (token === "--text" && typeof args[i + 1] === "string") {
			return normalizeWindowsEscapes(args[i + 1]);
		}
		if (token.startsWith("--text=")) {
			return normalizeWindowsEscapes(token.slice(7));
		}
	}
	return undefined;
};

const normalizeWindowsEscapes = (value: string): string => {
	if (process.platform !== "win32" || !value.includes("^")) return value;
	return value.replace(/\^+/g, "");
};

const hasValue = (value: unknown): value is string =>
	typeof value === "string" && value.length > 0;

if (isDirectExecution()) {
	const text = parseTextArgument() ?? DEFAULT_TEXT;
	const path = writeHelloSvg(text);
	console.log(`Wrote QR SVG for "${text}" to ${path}`);
}
