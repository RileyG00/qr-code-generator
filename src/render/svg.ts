import type { QrMatrix } from "../mask/types";
import type {
	BackgroundOptions,
	ColorSettings,
	CornerDotOptions,
	CornerDotShapeType,
	CornerSquareOptions,
	CornerSquareShapeType,
	DotOptions,
	DotShapeType,
	GradientType,
	HexColor,
} from "../styleTypes";
import {
	DEFAULT_BACKGROUND_HEX_COLORS,
	DEFAULT_BACKGROUND_TRANSPARENCY,
	DEFAULT_CORNER_DOT_STYLE,
	DEFAULT_CORNER_SQUARE_STYLE,
	DEFAULT_DOT_STYLE,
	DEFAULT_FOREGROUND_HEX_COLORS,
	DEFAULT_GRADIENT,
	DEFAULT_ROTATION,
} from "../styleTypes";

export interface SvgRenderOptions {
	margin?: number;
	size?: number;
	moduleSize?: number;
	backgroundOptions?: BackgroundOptions;
	dotOptions?: DotOptions;
	cornerSquareOptions?: CornerSquareOptions;
	cornerDotOptions?: CornerDotOptions;
	title?: string;
	desc?: string;
	shapeRendering?:
		| "auto"
		| "geometricPrecision"
		| "crispEdges"
		| "optimizeSpeed";
}

const DEFAULT_MARGIN = 1;
const DEFAULT_MODULE_SIZE = 8;
const DEFAULT_CODE_SIZE = 256;
const DEFAULT_SHAPE_RENDERING = "crispEdges";
const FINDER_PATTERN_SIZE = 7;
const INNER_DOT_START = 2;
const INNER_DOT_END = 4;

type GradientConfig = {
	colors: readonly HexColor[];
	gradient: GradientType;
	rotation: `${number}deg`;
};

type ColorFillConfig =
	| { kind: "solid"; color: string }
	| { kind: "gradient"; config: GradientConfig };

interface ResolvedBackgroundFill {
	fill: ColorFillConfig;
	isTransparent: boolean;
}

interface GradientBounds {
	width: number;
	height: number;
}

type ModuleShape = DotShapeType | CornerSquareShapeType | CornerDotShapeType;

interface CornerRadii {
	tl: number;
	tr: number;
	br: number;
	bl: number;
}

export const renderSvg = (
	matrix: QrMatrix,
	options: SvgRenderOptions = {},
): string => {
	if (!matrix || typeof matrix.size !== "number" || matrix.size <= 0) {
		throw new Error("renderSvg requires a matrix with a positive size.");
	}

	const marginModules = sanitizeMargin(options.margin);
	const sanitizedSize = sanitizeCodeSize(options.size);
	const hasExplicitSize =
		typeof options.size === "number" && Number.isFinite(options.size);
	let moduleSize = sanitizeModuleSize(options.moduleSize);
	const hasCustomStyleSelection =
		options.dotOptions?.style !== undefined ||
		options.cornerSquareOptions?.style !== undefined ||
		options.cornerDotOptions?.style !== undefined;
	const shapeRendering =
		options.shapeRendering ??
		(hasCustomStyleSelection
			? "geometricPrecision"
			: DEFAULT_SHAPE_RENDERING);

	const backgroundFill = resolveBackgroundFill(
		options.backgroundOptions,
		DEFAULT_BACKGROUND_HEX_COLORS[0],
	);
	const dotFillConfig = resolveColorFill(
		options.dotOptions,
		DEFAULT_FOREGROUND_HEX_COLORS,
	);
	const dotStyle = sanitizeDotStyle(options.dotOptions?.style);
	const cornerSquareFillConfig = options.cornerSquareOptions
		? resolveColorFill(
				options.cornerSquareOptions,
				DEFAULT_FOREGROUND_HEX_COLORS,
			)
		: undefined;
	const cornerSquareStyle = sanitizeCornerSquareStyle(
		options.cornerSquareOptions?.style,
	);
	const cornerDotFillConfig = options.cornerDotOptions
		? resolveColorFill(
				options.cornerDotOptions,
				DEFAULT_FOREGROUND_HEX_COLORS,
			)
		: undefined;
	const cornerDotStyle = sanitizeCornerDotStyle(
		options.cornerDotOptions?.style,
	);

	const modulesWithMargin = matrix.size + marginModules * 2;
	let pixelSize = modulesWithMargin * moduleSize;
	if (hasExplicitSize) {
		pixelSize = sanitizedSize;
		moduleSize = pixelSize / modulesWithMargin;
	}
	const viewBox = `0 0 ${pixelSize} ${pixelSize}`;
	const gradientBounds: GradientBounds = {
		width: pixelSize,
		height: pixelSize,
	};

	const gradientDefinitions: string[] = [];
	let gradientIndex = 0;
	const resolveFillValue = (
		prefix: string,
		config: ColorFillConfig,
	): string => {
		if (config.kind === "solid") return config.color;
		const gradientId = `${prefix}-gradient-${gradientIndex++}`;
		gradientDefinitions.push(
			createGradientDefinition(gradientId, config.config, gradientBounds),
		);
		return `url(#${gradientId})`;
	};

	const dotsFillValue = resolveFillValue("dots", dotFillConfig);
	const cornerSquaresFillValue = cornerSquareFillConfig
		? resolveFillValue("corner-squares", cornerSquareFillConfig)
		: dotsFillValue;
	const cornerDotsFillValue = cornerDotFillConfig
		? resolveFillValue("corner-dots", cornerDotFillConfig)
		: dotsFillValue;
	const backgroundFillValue = backgroundFill.isTransparent
		? undefined
		: resolveFillValue("background", backgroundFill.fill);

	const svg: string[] = [
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" shape-rendering="${shapeRendering}" width="${pixelSize}" height="${pixelSize}">`,
	];

	if (hasContent(options.title)) {
		svg.push(`<title>${escapeText(options.title)}</title>`);
	}
	if (hasContent(options.desc)) {
		svg.push(`<desc>${escapeText(options.desc)}</desc>`);
	}

	if (gradientDefinitions.length > 0) {
		svg.push("<defs>", ...gradientDefinitions, "</defs>");
	}

	if (backgroundFillValue) {
		svg.push(
			`<rect width="${pixelSize}" height="${pixelSize}" fill="${escapeAttribute(backgroundFillValue)}" />`,
		);
	}

	const offset = marginModules * moduleSize;
	for (let r = 0; r < matrix.size; r++) {
		for (let c = 0; c < matrix.size; c++) {
			if (matrix.values[r][c] !== 1) continue;
			const x = offset + c * moduleSize;
			const y = offset + r * moduleSize;
			const cornerType = getCornerModuleType(r, c, matrix.size);
			const moduleFill =
				cornerType === "cornerDot"
					? cornerDotsFillValue
					: cornerType === "cornerSquare"
						? cornerSquaresFillValue
						: dotsFillValue;
			const moduleStyle: ModuleShape =
				cornerType === "cornerDot"
					? cornerDotStyle
					: cornerType === "cornerSquare"
						? cornerSquareStyle
						: dotStyle;
			svg.push(
				createModuleElement(moduleStyle, x, y, moduleSize, moduleFill),
			);
		}
	}

	svg.push("</svg>");
	return svg.join("");
};

const resolveBackgroundFill = (
	options: BackgroundOptions | undefined,
	fallbackColor: string,
): ResolvedBackgroundFill => ({
	fill: resolveColorFill(
		options,
		DEFAULT_BACKGROUND_HEX_COLORS,
		fallbackColor,
	),
	isTransparent: options?.isTransparent ?? DEFAULT_BACKGROUND_TRANSPARENCY,
});

const resolveColorFill = (
	options: ColorSettings | undefined,
	defaultHexColors: readonly HexColor[],
	fallbackColor: string = defaultHexColors[0],
): ColorFillConfig => {
	const sanitizedHexColors = sanitizeHexColors(options?.hexColors);
	if (!sanitizedHexColors) {
		return { kind: "solid", color: fallbackColor ?? defaultHexColors[0] };
	}
	if (sanitizedHexColors.length === 1) {
		return { kind: "solid", color: sanitizedHexColors[0] };
	}
	return {
		kind: "gradient",
		config: {
			colors: sanitizedHexColors,
			gradient: sanitizeGradientType(options?.gradient),
			rotation: sanitizeRotationValue(options?.rotation),
		},
	};
};

const sanitizeDotStyle = (style: DotOptions["style"]): DotShapeType => {
	switch (style) {
		case "dot":
		case "rounded":
		case "extraRounded":
		case "classy":
		case "classyRounded":
		case "square":
			return style;
		default:
			return DEFAULT_DOT_STYLE;
	}
};

const sanitizeCornerSquareStyle = (
	style: CornerSquareOptions["style"],
): CornerSquareShapeType => {
	switch (style) {
		case "dot":
		case "rounded":
		case "square":
			return style;
		default:
			return DEFAULT_CORNER_SQUARE_STYLE;
	}
};

const sanitizeCornerDotStyle = (
	style: CornerDotOptions["style"],
): CornerDotShapeType => {
	switch (style) {
		case "dot":
		case "square":
			return style;
		default:
			return DEFAULT_CORNER_DOT_STYLE;
	}
};

const createModuleElement = (
	style: ModuleShape,
	x: number,
	y: number,
	size: number,
	fill: string,
): string => {
	const fillAttr = escapeAttribute(fill);
	switch (style) {
		case "dot": {
			const radius = size / 2;
			const cx = x + radius;
			const cy = y + radius;
			return `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${fillAttr}" />`;
		}
		case "rounded": {
			const radius = size * 0.35;
			return createRoundedRectElement(
				x,
				y,
				size,
				{ tl: radius, tr: radius, br: radius, bl: radius },
				fillAttr,
			);
		}
		case "extraRounded": {
			const radius = size / 2;
			return createRoundedRectElement(
				x,
				y,
				size,
				{ tl: radius, tr: radius, br: radius, bl: radius },
				fillAttr,
			);
		}
		case "classy": {
			const primary = size / 2;
			return createRoundedRectElement(
				x,
				y,
				size,
				{ tl: primary, tr: 0, br: primary, bl: 0 },
				fillAttr,
			);
		}
		case "classyRounded": {
			const primary = size * 0.5;
			const secondary = size * 0.2;
			return createRoundedRectElement(
				x,
				y,
				size,
				{ tl: primary, tr: secondary, br: primary, bl: secondary },
				fillAttr,
			);
		}
		case "square":
		default:
			return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${fillAttr}" />`;
	}
};

const createRoundedRectElement = (
	x: number,
	y: number,
	size: number,
	radii: CornerRadii,
	fillAttr: string,
): string => {
	const d = buildRoundedRectPath(x, y, size, radii);
	return `<path d="${d}" fill="${fillAttr}" />`;
};

const buildRoundedRectPath = (
	x: number,
	y: number,
	size: number,
	radii: CornerRadii,
): string => {
	const tl = clampRadius(radii.tl, size);
	const tr = clampRadius(radii.tr, size);
	const br = clampRadius(radii.br, size);
	const bl = clampRadius(radii.bl, size);
	const right = x + size;
	const bottom = y + size;
	return [
		`M ${x + tl} ${y}`,
		`H ${right - tr}`,
		`Q ${right} ${y} ${right} ${y + tr}`,
		`V ${bottom - br}`,
		`Q ${right} ${bottom} ${right - br} ${bottom}`,
		`H ${x + bl}`,
		`Q ${x} ${bottom} ${x} ${bottom - bl}`,
		`V ${y + tl}`,
		`Q ${x} ${y} ${x + tl} ${y}`,
		"Z",
	].join(" ");
};

const clampRadius = (radius: number, size: number): number => {
	const limit = size / 2;
	if (!Number.isFinite(radius) || radius <= 0) return 0;
	return Math.min(radius, limit);
};

const HEX_COLOR_REGEX =
	/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const sanitizeHexColors = (
	colors: readonly HexColor[] | undefined,
): HexColor[] | undefined => {
	if (!Array.isArray(colors)) return undefined;
	const filtered = colors.filter((color) => HEX_COLOR_REGEX.test(color));
	if (filtered.length === 0) return undefined;
	return filtered.slice() as HexColor[];
};

const sanitizeGradientType = (
	value: GradientType | undefined,
): GradientType => {
	if (value === "radial" || value === "linear") return value;
	return DEFAULT_GRADIENT;
};

const sanitizeRotationValue = (
	rotation: number | undefined,
): `${number}deg` => {
	const rotationDegree: `${number}deg` | undefined = rotation
		? `${rotation}deg`
		: `${DEFAULT_ROTATION}deg`;

	if (typeof rotationDegree !== "string") return rotationDegree;
	const normalized = rotationDegree.trim().toLowerCase();
	if (!normalized.endsWith("deg")) return rotationDegree;
	const numeric = Number.parseFloat(normalized.slice(0, -3));
	if (!Number.isFinite(numeric)) return rotationDegree;
	return `${numeric}deg`;
};

const extractRotationDegrees = (rotation: `${number}deg`): number => {
	const numeric = Number.parseFloat(rotation.slice(0, -3));
	return Number.isFinite(numeric) ? numeric : 0;
};

const createGradientDefinition = (
	id: string,
	config: GradientConfig,
	bounds: GradientBounds,
): string => {
	const stops = createGradientStops(config.colors);
	const { width, height } = bounds;
	if (config.gradient === "radial") {
		const radius = Math.max(width, height) / 2;
		return `<radialGradient id="${id}" cx="${width / 2}" cy="${height / 2}" r="${radius}" gradientUnits="userSpaceOnUse">${stops}</radialGradient>`;
	}
	const rotation = extractRotationDegrees(config.rotation);
	const centerX = width / 2;
	const centerY = height / 2;
	return `<linearGradient id="${id}" x1="0" y1="0" x2="${width}" y2="0" gradientUnits="userSpaceOnUse" gradientTransform="rotate(${rotation}, ${centerX}, ${centerY})">${stops}</linearGradient>`;
};

const createGradientStops = (colors: readonly HexColor[]): string => {
	if (colors.length === 0) return "";
	if (colors.length === 1) {
		return `<stop offset="0%" stop-color="${escapeAttribute(colors[0])}" />`;
	}
	return colors
		.map((color, index) => {
			const offset = (index / (colors.length - 1)) * 100;
			return `<stop offset="${offset}%" stop-color="${escapeAttribute(color)}" />`;
		})
		.join("");
};

const getCornerModuleType = (
	row: number,
	col: number,
	size: number,
): "cornerSquare" | "cornerDot" | undefined => {
	const origins = [
		{ row: 0, col: 0 },
		{ row: 0, col: size - FINDER_PATTERN_SIZE },
		{ row: size - FINDER_PATTERN_SIZE, col: 0 },
	];
	for (const origin of origins) {
		if (
			row >= origin.row &&
			row < origin.row + FINDER_PATTERN_SIZE &&
			col >= origin.col &&
			col < origin.col + FINDER_PATTERN_SIZE
		) {
			const localRow = row - origin.row;
			const localCol = col - origin.col;
			if (
				localRow >= INNER_DOT_START &&
				localRow <= INNER_DOT_END &&
				localCol >= INNER_DOT_START &&
				localCol <= INNER_DOT_END
			) {
				return "cornerDot";
			}
			return "cornerSquare";
		}
	}
	return undefined;
};

const sanitizeMargin = (value: number | undefined): number => {
	if (typeof value !== "number" || !Number.isFinite(value))
		return DEFAULT_MARGIN;
	return Math.max(0, Math.floor(value));
};

const sanitizeCodeSize = (value: number | undefined): number => {
	if (typeof value !== "number" || !Number.isFinite(value))
		return DEFAULT_CODE_SIZE;
	return Math.max(32, Math.floor(value));
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
