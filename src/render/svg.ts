import type { QrMatrix } from "../mask/types";

export interface SvgRenderOptions {
	margin?: number;
	moduleSize?: number;
	darkColor?: string;
	lightColor?: string;
	backgroundColor?: string;
	title?: string;
	desc?: string;
	shapeRendering?:
		| "auto"
		| "geometricPrecision"
		| "crispEdges"
		| "optimizeSpeed"
		| (string & {});
}

const DEFAULT_MARGIN = 4;
const DEFAULT_MODULE_SIZE = 8;
const DEFAULT_LIGHT_COLOR = "#ffffff";
const DEFAULT_DARK_COLOR = "#000000";
const DEFAULT_SHAPE_RENDERING = "crispEdges";

export const renderSvg = (
	matrix: QrMatrix,
	options: SvgRenderOptions = {},
): string => {
	if (!matrix || typeof matrix.size !== "number" || matrix.size <= 0) {
		throw new Error("renderSvg requires a matrix with a positive size.");
	}

	const marginModules = sanitizeMargin(options.margin);
	const moduleSize = sanitizeModuleSize(options.moduleSize);
	const shapeRendering = options.shapeRendering ?? DEFAULT_SHAPE_RENDERING;
	const lightColor =
		options.lightColor ?? options.backgroundColor ?? DEFAULT_LIGHT_COLOR;
	const darkColor = options.darkColor ?? DEFAULT_DARK_COLOR;

	const modulesWithMargin = matrix.size + marginModules * 2;
	const pixelSize = modulesWithMargin * moduleSize;
	const viewBox = `0 0 ${pixelSize} ${pixelSize}`;

	const svg: string[] = [
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" shape-rendering="${shapeRendering}" width="${pixelSize}" height="${pixelSize}">`,
	];

	if (hasContent(options.title)) {
		svg.push(`<title>${escapeText(options.title)}</title>`);
	}
	if (hasContent(options.desc)) {
		svg.push(`<desc>${escapeText(options.desc)}</desc>`);
	}

	svg.push(
		`<rect width="${pixelSize}" height="${pixelSize}" fill="${escapeAttribute(lightColor)}" />`,
	);

	const offset = marginModules * moduleSize;
	for (let r = 0; r < matrix.size; r++) {
		for (let c = 0; c < matrix.size; c++) {
			if (matrix.values[r][c] !== 1) continue;
			const x = offset + c * moduleSize;
			const y = offset + r * moduleSize;
			svg.push(
				`<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" fill="${escapeAttribute(darkColor)}" />`,
			);
		}
	}

	svg.push("</svg>");
	return svg.join("");
};

const sanitizeMargin = (value: number | undefined): number => {
	if (typeof value !== "number" || !Number.isFinite(value))
		return DEFAULT_MARGIN;
	return Math.max(0, Math.floor(value));
};

const sanitizeModuleSize = (value: number | undefined): number => {
	if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
		return DEFAULT_MODULE_SIZE;
	}
	return value;
};

const hasContent = (value: string | undefined): value is string =>
	typeof value === "string" && value.length > 0;

const ESCAPE_LOOKUP: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&apos;",
};

const escapeText = (value: string): string =>
	String(value).replace(/[&<>"']/g, (char) => ESCAPE_LOOKUP[char]);

const escapeAttribute = (value: string): string => escapeText(value);
