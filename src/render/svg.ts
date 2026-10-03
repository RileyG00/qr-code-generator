import type { QrMatrix } from "../mask/types";
import type {
	BackgroundOptions,
	ColorSettings,
	CornerDotOptions,
	CornerDotShapeType,
	CornerSquareOptions,
	CornerSquareShapeType,
	DesignStyleOptions,
	DotOptions,
	DotShapeType,
	GradientType,
	HexColor,
	ImageOptions,
	ImageShape,
	QrShape,
} from "../styleTypes";
import {
	DEFAULT_BACKGROUND_HEX_COLORS,
	DEFAULT_BACKGROUND_TRANSPARENCY,
	DEFAULT_CORNER_DOT_STYLE,
	DEFAULT_CORNER_SQUARE_STYLE,
	DEFAULT_DOT_STYLE,
	DEFAULT_FOREGROUND_HEX_COLORS,
	DEFAULT_GRADIENT,
	DEFAULT_IMAGE_OPACITY,
	DEFAULT_IMAGE_PADDING_MODULES,
	DEFAULT_IMAGE_SAFE_ZONE_MODULES,
	DEFAULT_IMAGE_SCALE,
	DEFAULT_IMAGE_SHAPE,
	DEFAULT_QR_SHAPE,
	DEFAULT_ROTATION,
} from "../styleTypes";

export interface SvgRenderOptions {
	margin?: number;
	size?: number;
	moduleSize?: number;
	/**
	 * "circle" wraps the code in a circle filled with decorative modules
	 * drawn in the dot style. The scannable code itself stays square.
	 */
	shape?: QrShape;
	styling?: DesignStyleOptions;
	title?: string;
	desc?: string;
	shapeRendering?:
		| "auto"
		| "geometricPrecision"
		| "crispEdges"
		| "optimizeSpeed";
}

// The QR spec mandates a quiet zone of at least 4 modules on every side;
// anything smaller frequently fails to scan on real-world cameras.
const DEFAULT_MARGIN = 4;
const DEFAULT_MODULE_SIZE = 8;
const DEFAULT_CODE_SIZE = 256;
const DEFAULT_SHAPE_RENDERING = "crispEdges";
const FINDER_PATTERN_SIZE = 7;
// Version 1 (21x21) is the smallest matrix with three non-overlapping finders.
const MIN_QR_SIZE = 21;
const INNER_DOT_START = 2;
const INNER_DOT_END = 4;
const MIN_IMAGE_SCALE = 0.05;
const MAX_IMAGE_SCALE = 0.4;
const DEFAULT_IMAGE_CORNER_RADIUS_RATIO = 0.25;
// Empty modules kept between the code and the circle's decorative modules.
const CIRCLE_GAP_MODULES = 1;

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

// undefined = data module; otherwise the part of a finder pattern.
type ModuleRegion = "cornerSquare" | "cornerDot" | undefined;

interface DefinitionRegistry {
	nextId: (prefix: string) => string;
	add: (definition: string) => void;
}

interface ResolvedImageOverlay {
	source: string;
	altText?: string;
	width: number;
	height: number;
	x: number;
	y: number;
	background?: {
		x: number;
		y: number;
		width: number;
		height: number;
		fill?: string;
		cornerRadius?: number;
		shape: ImageShape;
	};
	// Modules whose centers fall inside are not drawn; absent when
	// hideBackgroundDots is false.
	safeZoneRect?: { x: number; y: number; width: number; height: number };
	paddingModules: number;
	safeZoneModules: number;
	hideBackgroundDots: boolean;
	hideBackground: boolean;
	scale: number;
	pixelSize: number;
	shape: ImageShape;
	cornerRadius?: number;
	backgroundColor?: HexColor;
	clipPathId?: string;
	opacity: number;
	preserveAspectRatio: string;
}

interface ImageOverlayContext {
	moduleSize: number;
	qrSpan: number;
	qrOffset: number;
	defs: DefinitionRegistry;
}

const convertFillToColorSettings = (fill: ColorFillConfig): ColorSettings => {
	if (fill.kind === "solid") {
		return { hexColors: [fill.color as HexColor] };
	}
	return {
		hexColors: fill.config.colors.slice() as HexColor[],
		gradient: fill.config.gradient,
		rotation: extractRotationDegrees(fill.config.rotation),
	};
};

export const renderSvg = (
	matrix: QrMatrix,
	options: SvgRenderOptions = {},
): { svg: string; styling: DesignStyleOptions } => {
	if (!matrix || typeof matrix.size !== "number" || matrix.size <= 0) {
		throw new Error("renderSvg requires a matrix with a positive size.");
	}

	const marginModules = sanitizeMargin(options.margin);
	const sanitizedSize = sanitizeCodeSize(options.size);
	const hasExplicitSize =
		typeof options.size === "number" && Number.isFinite(options.size);
	let moduleSize = sanitizeModuleSize(options.moduleSize);
	const resolvedDotOptions =
		options.styling?.dotOptions ?? options.styling?.dotOptions;
	const resolvedCornerSquareOptions =
		options.styling?.cornerSquareOptions ??
		options.styling?.cornerSquareOptions;
	const resolvedCornerDotOptions =
		options.styling?.cornerDotOptions ?? options.styling?.cornerDotOptions;
	const resolvedBackgroundOptions =
		options.styling?.backgroundOptions ??
		options.styling?.backgroundOptions;
	const hasCustomStyleSelection =
		resolvedDotOptions?.style !== undefined ||
		resolvedCornerSquareOptions?.style !== undefined ||
		resolvedCornerDotOptions?.style !== undefined;
	const shapeRendering =
		options.shapeRendering ??
		(hasCustomStyleSelection
			? "geometricPrecision"
			: DEFAULT_SHAPE_RENDERING);

	const backgroundFill = resolveBackgroundFill(
		resolvedBackgroundOptions,
		DEFAULT_BACKGROUND_HEX_COLORS[0],
	);
	const dotFillConfig = resolveColorFill(
		resolvedDotOptions,
		DEFAULT_FOREGROUND_HEX_COLORS,
	);
	const dotStyle = sanitizeDotStyle(resolvedDotOptions?.style);
	const cornerSquareFillConfig = resolvedCornerSquareOptions
		? resolveColorFill(
				resolvedCornerSquareOptions,
				DEFAULT_FOREGROUND_HEX_COLORS,
			)
		: undefined;
	const cornerSquareStyle = sanitizeCornerSquareStyle(
		resolvedCornerSquareOptions?.style,
	);
	const cornerDotFillConfig = resolvedCornerDotOptions
		? resolveColorFill(
				resolvedCornerDotOptions,
				DEFAULT_FOREGROUND_HEX_COLORS,
			)
		: undefined;
	const cornerDotStyle = sanitizeCornerDotStyle(
		resolvedCornerDotOptions?.style,
	);

	const shape = sanitizeQrShape(options.shape);
	// For a circle, pad the code out to the circle that circumscribes it
	// (diameter = size * sqrt(2)); that padding holds decorative modules.
	const circlePadding =
		shape === "circle"
			? Math.ceil((matrix.size * (Math.SQRT2 - 1)) / 2)
			: 0;
	const modulesWithMargin =
		matrix.size + (circlePadding + marginModules) * 2;
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

	const defs: string[] = [];
	let definitionIndex = 0;
	const nextDefinitionId = (prefix: string): string =>
		`${prefix}-${definitionIndex++}`;
	const registerDefinition = (definition: string): void => {
		defs.push(definition);
	};
	const resolveFillValue = (
		prefix: string,
		config: ColorFillConfig,
	): string => {
		if (config.kind === "solid") return config.color;
		const gradientId = nextDefinitionId(`${prefix}-gradient`);
		registerDefinition(
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
	const offset = (marginModules + circlePadding) * moduleSize;
	const qrSpan = matrix.size * moduleSize;
	const imageOverlay = resolveImageOverlay(options.styling?.imageOptions, {
		moduleSize,
		qrSpan,
		qrOffset: offset,
		defs: {
			nextId: nextDefinitionId,
			add: registerDefinition,
		},
	});

	const svg: string[] = [
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" shape-rendering="${shapeRendering}" width="${pixelSize}" height="${pixelSize}">`,
	];

	if (hasContent(options.title)) {
		svg.push(`<title>${escapeText(options.title)}</title>`);
	}
	if (hasContent(options.desc)) {
		svg.push(`<desc>${escapeText(options.desc)}</desc>`);
	}

	if (defs.length > 0) {
		svg.push("<defs>", ...defs, "</defs>");
	}

	if (backgroundFillValue) {
		svg.push(
			`<rect width="${pixelSize}" height="${pixelSize}" fill="${escapeAttribute(backgroundFillValue)}" />`,
		);
	}

	const safeZoneRect = imageOverlay?.safeZoneRect;
	// A module is drawn when it is dark, belongs to the requested region
	// (data vs. finder ring vs. finder center) and is not covered by the logo.
	// Neighbor lookups use the same predicate so connected shapes only merge
	// with modules that are actually rendered in the same style.
	const isModuleVisible = (
		r: number,
		c: number,
		region: ModuleRegion,
	): boolean => {
		if (r < 0 || c < 0 || r >= matrix.size || c >= matrix.size) {
			return false;
		}
		if (matrix.values[r][c] !== 1) return false;
		if (getCornerModuleType(r, c, matrix.size) !== region) return false;
		if (
			safeZoneRect &&
			isPointInsideRect(
				offset + c * moduleSize + moduleSize / 2,
				offset + r * moduleSize + moduleSize / 2,
				safeZoneRect,
			)
		) {
			return false;
		}
		return true;
	};
	const collectModulePaths = (
		target: string[],
		region: ModuleRegion,
		style: DotShapeType,
		rows: [number, number] = [0, matrix.size],
		cols: [number, number] = [0, matrix.size],
	): void => {
		for (let r = rows[0]; r < rows[1]; r++) {
			for (let c = cols[0]; c < cols[1]; c++) {
				if (!isModuleVisible(r, c, region)) continue;
				target.push(
					createModulePath(
						style,
						offset + c * moduleSize,
						offset + r * moduleSize,
						moduleSize,
						(dx, dy) => isModuleVisible(r + dy, c + dx, region),
					),
				);
			}
		}
	};

	// Each group is emitted as a single <path> so adjacent modules rasterize
	// as one shape (no anti-aliasing seams between them) and the SVG stays
	// compact. Modules never overlap, so evenodd only affects finder rings.
	const dotPaths: string[] = [];
	const cornerSquarePaths: string[] = [];
	const cornerDotPaths: string[] = [];

	collectModulePaths(dotPaths, undefined, dotStyle);

	if (circlePadding > 0) {
		// Decorative modules live on the same grid as the code, in rows and
		// columns from -circlePadding to size + circlePadding - 1.
		const radius = matrix.size / 2 + circlePadding;
		const seed = hashMatrix(matrix);
		const isDecorationVisible = (r: number, c: number): boolean => {
			const nearCode =
				r >= -CIRCLE_GAP_MODULES &&
				r < matrix.size + CIRCLE_GAP_MODULES &&
				c >= -CIRCLE_GAP_MODULES &&
				c < matrix.size + CIRCLE_GAP_MODULES;
			if (nearCode) return false;
			const dy = r + 0.5 - matrix.size / 2;
			const dx = c + 0.5 - matrix.size / 2;
			// Keep the whole module inside the circle.
			if (Math.hypot(dx, dy) + Math.SQRT1_2 > radius) return false;
			return isDecorationDark(seed, r, c);
		};
		for (let r = -circlePadding; r < matrix.size + circlePadding; r++) {
			for (let c = -circlePadding; c < matrix.size + circlePadding; c++) {
				if (!isDecorationVisible(r, c)) continue;
				dotPaths.push(
					createModulePath(
						dotStyle,
						offset + c * moduleSize,
						offset + r * moduleSize,
						moduleSize,
						(dx, dy) => isDecorationVisible(r + dy, c + dx),
					),
				);
			}
		}
	}

	const drawWholeFinders = matrix.size >= MIN_QR_SIZE;
	for (const origin of getFinderOrigins(matrix.size)) {
		const rows: [number, number] = [
			origin.row,
			origin.row + FINDER_PATTERN_SIZE,
		];
		const cols: [number, number] = [
			origin.col,
			origin.col + FINDER_PATTERN_SIZE,
		];
		const x = offset + origin.col * moduleSize;
		const y = offset + origin.row * moduleSize;

		if (drawWholeFinders && isWholeCornerSquareStyle(cornerSquareStyle)) {
			cornerSquarePaths.push(
				createCornerSquarePath(
					cornerSquareStyle,
					x,
					y,
					moduleSize * FINDER_PATTERN_SIZE,
				),
			);
		} else {
			collectModulePaths(
				cornerSquarePaths,
				"cornerSquare",
				cornerSquareStyle,
				rows,
				cols,
			);
		}

		if (drawWholeFinders && isWholeCornerDotStyle(cornerDotStyle)) {
			const dotSpan = (INNER_DOT_END - INNER_DOT_START + 1) * moduleSize;
			cornerDotPaths.push(
				createCirclePath(
					x + INNER_DOT_START * moduleSize,
					y + INNER_DOT_START * moduleSize,
					dotSpan,
				),
			);
		} else {
			collectModulePaths(
				cornerDotPaths,
				"cornerDot",
				cornerDotStyle,
				rows,
				cols,
			);
		}
	}

	for (const [paths, fill] of [
		[dotPaths, dotsFillValue],
		[cornerSquarePaths, cornerSquaresFillValue],
		[cornerDotPaths, cornerDotsFillValue],
	] as const) {
		if (paths.length === 0) continue;
		svg.push(
			`<path d="${paths.join(" ")}" fill="${escapeAttribute(fill)}" fill-rule="evenodd" />`,
		);
	}

	if (imageOverlay?.background) {
		svg.push(
			createImageShapeElement({
				shape: imageOverlay.background.shape,
				x: imageOverlay.background.x,
				y: imageOverlay.background.y,
				width: imageOverlay.background.width,
				height: imageOverlay.background.height,
				cornerRadius: imageOverlay.background.cornerRadius,
				fill: imageOverlay.background.fill,
			}),
		);
	}

	if (imageOverlay) {
		const attrs: string[] = [
			`x="${imageOverlay.x}"`,
			`y="${imageOverlay.y}"`,
			`width="${imageOverlay.width}"`,
			`height="${imageOverlay.height}"`,
			`href="${escapeAttribute(imageOverlay.source)}"`,
			`preserveAspectRatio="${escapeAttribute(imageOverlay.preserveAspectRatio)}"`,
		];
		if (imageOverlay.opacity < 1) {
			attrs.push(`opacity="${imageOverlay.opacity.toFixed(3)}"`);
		}
		if (imageOverlay.clipPathId) {
			attrs.push(`clip-path="url(#${imageOverlay.clipPathId})"`);
		}
		if (hasContent(imageOverlay.altText)) {
			attrs.push(
				`aria-label="${escapeAttribute(imageOverlay.altText!)}"`,
				`role="img"`,
			);
		}
		svg.push(`<image ${attrs.join(" ")} />`);
	}

	svg.push("</svg>");

	const styling: DesignStyleOptions = {
		backgroundOptions: {
			...convertFillToColorSettings(backgroundFill.fill),
			isTransparent: backgroundFill.isTransparent,
		},
		dotOptions: {
			...convertFillToColorSettings(dotFillConfig),
			style: dotStyle,
		},
		cornerSquareOptions: {
			...convertFillToColorSettings(
				cornerSquareFillConfig ?? dotFillConfig,
			),
			style: cornerSquareStyle,
		},
		cornerDotOptions: {
			...convertFillToColorSettings(cornerDotFillConfig ?? dotFillConfig),
			style: cornerDotStyle,
		},
	};
	if (imageOverlay) {
		styling.imageOptions = {
			source: imageOverlay.source,
			altText: imageOverlay.altText,
			scale: imageOverlay.scale,
			pixelSize: imageOverlay.pixelSize,
			safeZoneModules: imageOverlay.safeZoneModules,
			paddingModules: imageOverlay.paddingModules,
			hideBackgroundDots: imageOverlay.hideBackgroundDots,
			hideBackground: imageOverlay.hideBackground,
			shape: imageOverlay.shape,
			cornerRadius: imageOverlay.cornerRadius,
			backgroundColor: imageOverlay.backgroundColor,
			opacity: imageOverlay.opacity,
			preserveAspectRatio: imageOverlay.preserveAspectRatio,
		};
	}

	return { svg: svg.join(""), styling };
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

const sanitizeDotStyle = (style: DotOptions["style"]): DotShapeType =>
	isShapeStyle(style) ? style : DEFAULT_DOT_STYLE;

const SHAPE_STYLES: readonly DotShapeType[] = [
	"square",
	"dot",
	"rounded",
	"extraRounded",
	"classy",
	"classyRounded",
];

const isShapeStyle = (style: unknown): style is DotShapeType =>
	SHAPE_STYLES.includes(style as DotShapeType);

const sanitizeCornerSquareStyle = (
	style: CornerSquareOptions["style"],
): CornerSquareShapeType =>
	isShapeStyle(style) ? style : DEFAULT_CORNER_SQUARE_STYLE;

const sanitizeCornerDotStyle = (
	style: CornerDotOptions["style"],
): CornerDotShapeType =>
	isShapeStyle(style) ? style : DEFAULT_CORNER_DOT_STYLE;

// Finder styles drawn as a single shape across the whole 7x7 ring / 3x3
// center. Every other style is drawn module-by-module like the data dots.
const isWholeCornerSquareStyle = (style: CornerSquareShapeType): boolean =>
	style === "dot" || style === "extraRounded";

const isWholeCornerDotStyle = (style: CornerDotShapeType): boolean =>
	style === "dot";

/*
 * Module and finder geometry below is adapted from qr-code-styling
 * (https://github.com/kozakdenys/qr-code-styling), MIT License,
 * Copyright (c) 2019 Denys Kozak.
 */

// Reports whether the module offset by (dx, dy) columns/rows is drawn.
type NeighborLookup = (dx: number, dy: number) => boolean;

// Clockwise quarter turns around the module center.
type QuarterTurns = 0 | 1 | 2 | 3;

type PathCommand =
	| { op: "M" | "L"; x: number; y: number }
	| {
			op: "A";
			r: number;
			largeArc: 0 | 1;
			sweep: 0 | 1;
			x: number;
			y: number;
	  }
	| { op: "Z" };

// Returns path data for one module; callers join modules into one <path>.
const createModulePath = (
	style: DotShapeType,
	x: number,
	y: number,
	size: number,
	hasNeighbor: NeighborLookup,
): string => {
	switch (style) {
		case "dot":
			return createCirclePath(x, y, size);
		case "rounded":
		case "extraRounded":
			return createRoundedModulePath(
				style === "extraRounded",
				x,
				y,
				size,
				hasNeighbor,
			);
		case "classy":
		case "classyRounded":
			return createClassyModulePath(
				style === "classyRounded",
				x,
				y,
				size,
				hasNeighbor,
			);
		case "square":
		default:
			return createSquarePath(x, y, size);
	}
};

// Isolated modules become circles, line ends become half-pills, and outer
// corners of a run are rounded so neighboring modules flow together.
const createRoundedModulePath = (
	extra: boolean,
	x: number,
	y: number,
	size: number,
	hasNeighbor: NeighborLookup,
): string => {
	const left = hasNeighbor(-1, 0);
	const right = hasNeighbor(1, 0);
	const top = hasNeighbor(0, -1);
	const bottom = hasNeighbor(0, 1);
	const count = +left + +right + +top + +bottom;

	if (count === 0) {
		return createCirclePath(x, y, size);
	}
	if (count > 2 || (left && right) || (top && bottom)) {
		return createSquarePath(x, y, size);
	}
	if (count === 2) {
		const turns: QuarterTurns =
			left && top ? 1 : top && right ? 2 : right && bottom ? 3 : 0;
		const commands = extra
			? cornerExtraRoundedCommands(size)
			: cornerRoundedCommands(size);
		return createRotatedPath(x, y, size, turns, commands);
	}
	const turns: QuarterTurns = top ? 1 : right ? 2 : bottom ? 3 : 0;
	return createRotatedPath(x, y, size, turns, sideRoundedCommands(size));
};

// Rounds the top-left and bottom-right edges of each run, giving the
// leaf-like "classy" look.
const createClassyModulePath = (
	extra: boolean,
	x: number,
	y: number,
	size: number,
	hasNeighbor: NeighborLookup,
): string => {
	const left = hasNeighbor(-1, 0);
	const right = hasNeighbor(1, 0);
	const top = hasNeighbor(0, -1);
	const bottom = hasNeighbor(0, 1);
	const cornerCommands = extra
		? cornerExtraRoundedCommands(size)
		: cornerRoundedCommands(size);

	if (!left && !right && !top && !bottom) {
		return createRotatedPath(x, y, size, 1, cornersRoundedCommands(size));
	}
	if (!left && !top) {
		return createRotatedPath(x, y, size, 3, cornerCommands);
	}
	if (!right && !bottom) {
		return createRotatedPath(x, y, size, 1, cornerCommands);
	}
	return createSquarePath(x, y, size);
};

// Base shapes are expressed in module-local coordinates (0..size) and
// rotated into place by createRotatedPath.

// Right side rounded into a half circle.
const sideRoundedCommands = (s: number): PathCommand[] => [
	{ op: "M", x: 0, y: 0 },
	{ op: "L", x: 0, y: s },
	{ op: "L", x: s / 2, y: s },
	{ op: "A", r: s / 2, largeArc: 0, sweep: 0, x: s / 2, y: 0 },
	{ op: "Z" },
];

// Top-right corner rounded with a half-module radius.
const cornerRoundedCommands = (s: number): PathCommand[] => [
	{ op: "M", x: 0, y: 0 },
	{ op: "L", x: 0, y: s },
	{ op: "L", x: s, y: s },
	{ op: "L", x: s, y: s / 2 },
	{ op: "A", r: s / 2, largeArc: 0, sweep: 0, x: s / 2, y: 0 },
	{ op: "Z" },
];

// Top-right corner rounded with a full-module radius.
const cornerExtraRoundedCommands = (s: number): PathCommand[] => [
	{ op: "M", x: 0, y: 0 },
	{ op: "L", x: 0, y: s },
	{ op: "L", x: s, y: s },
	{ op: "A", r: s, largeArc: 0, sweep: 0, x: 0, y: 0 },
	{ op: "Z" },
];

// Bottom-left and top-right corners rounded.
const cornersRoundedCommands = (s: number): PathCommand[] => [
	{ op: "M", x: 0, y: 0 },
	{ op: "L", x: 0, y: s / 2 },
	{ op: "A", r: s / 2, largeArc: 0, sweep: 0, x: s / 2, y: s },
	{ op: "L", x: s, y: s },
	{ op: "L", x: s, y: s / 2 },
	{ op: "A", r: s / 2, largeArc: 0, sweep: 0, x: s / 2, y: 0 },
	{ op: "Z" },
];

const createRotatedPath = (
	x: number,
	y: number,
	size: number,
	turns: QuarterTurns,
	commands: PathCommand[],
): string => {
	const half = size / 2;
	const place = (px: number, py: number): string => {
		let dx = px - half;
		let dy = py - half;
		// SVG y grows downward, so (dx, dy) -> (-dy, dx) is a clockwise turn.
		for (let i = 0; i < turns; i++) {
			[dx, dy] = [-dy, dx];
		}
		return `${formatNumber(x + half + dx)} ${formatNumber(y + half + dy)}`;
	};
	// Rotation preserves orientation, so arc sweep flags stay valid.
	return commands
		.map((cmd) => {
			switch (cmd.op) {
				case "M":
				case "L":
					return `${cmd.op} ${place(cmd.x, cmd.y)}`;
				case "A":
					return `A ${formatNumber(cmd.r)} ${formatNumber(cmd.r)} 0 ${cmd.largeArc} ${cmd.sweep} ${place(cmd.x, cmd.y)}`;
				case "Z":
					return "Z";
			}
		})
		.join(" ");
};

const createSquarePath = (x: number, y: number, size: number): string => {
	const s = formatNumber(size);
	return `M ${formatNumber(x)} ${formatNumber(y)} h ${s} v ${s} h -${s} Z`;
};

// Circle inscribed in the size x size box at (x, y), as two half arcs.
const createCirclePath = (x: number, y: number, size: number): string =>
	circlePath(x + size / 2, y + size / 2, size / 2);

const circlePath = (cx: number, cy: number, r: number): string => {
	const left = formatNumber(cx - r);
	const right = formatNumber(cx + r);
	const y = formatNumber(cy);
	const radius = formatNumber(r);
	return `M ${left} ${y} A ${radius} ${radius} 0 1 0 ${right} ${y} A ${radius} ${radius} 0 1 0 ${left} ${y} Z`;
};

// Path data for the 7x7 finder ring as one shape; the hole relies on
// fill-rule="evenodd". `size` spans the whole ring.
const createCornerSquarePath = (
	style: CornerSquareShapeType,
	x: number,
	y: number,
	size: number,
): string => {
	const unit = size / FINDER_PATTERN_SIZE;
	if (style === "dot") {
		const cx = x + size / 2;
		const cy = y + size / 2;
		return `${circlePath(cx, cy, size / 2)} ${circlePath(cx, cy, size / 2 - unit)}`;
	}

	// extraRounded: rounded-rect ring with 2.5-module outer corners and
	// 1.5-module inner corners.
	const n = (value: number): string => formatNumber(value);
	const outer = 2.5 * unit;
	const inner = 1.5 * unit;
	const straight = 2 * unit;
	return [
		`M ${n(x)} ${n(y + outer)}`,
		`v ${n(straight)}`,
		`a ${n(outer)} ${n(outer)} 0 0 0 ${n(outer)} ${n(outer)}`,
		`h ${n(straight)}`,
		`a ${n(outer)} ${n(outer)} 0 0 0 ${n(outer)} ${n(-outer)}`,
		`v ${n(-straight)}`,
		`a ${n(outer)} ${n(outer)} 0 0 0 ${n(-outer)} ${n(-outer)}`,
		`h ${n(-straight)}`,
		`a ${n(outer)} ${n(outer)} 0 0 0 ${n(-outer)} ${n(outer)}`,
		"Z",
		`M ${n(x + outer)} ${n(y + unit)}`,
		`h ${n(straight)}`,
		`a ${n(inner)} ${n(inner)} 0 0 1 ${n(inner)} ${n(inner)}`,
		`v ${n(straight)}`,
		`a ${n(inner)} ${n(inner)} 0 0 1 ${n(-inner)} ${n(inner)}`,
		`h ${n(-straight)}`,
		`a ${n(inner)} ${n(inner)} 0 0 1 ${n(-inner)} ${n(-inner)}`,
		`v ${n(-straight)}`,
		`a ${n(inner)} ${n(inner)} 0 0 1 ${n(inner)} ${n(-inner)}`,
		"Z",
	].join(" ");
};

// Trims floating-point noise (e.g. 10.400000000000002) from path output.
const formatNumber = (value: number): string =>
	String(Math.round(value * 1e4) / 1e4);

const resolveImageOverlay = (
	options: ImageOptions | undefined,
	context: ImageOverlayContext,
): ResolvedImageOverlay | undefined => {
	if (!options || !hasContent(options.source)) return undefined;
	const qrSpan = context.qrSpan;
	if (qrSpan <= 0) return undefined;

	const scale = sanitizeImageScale(options.scale);
	const pixelSize = sanitizeImagePixelSize(options.pixelSize, qrSpan, scale);
	if (pixelSize <= 0) return undefined;

	const paddingModules = sanitizeNonNegativeModules(
		options.paddingModules,
		DEFAULT_IMAGE_PADDING_MODULES,
	);
	const safeZoneModules = Math.max(
		paddingModules,
		sanitizeNonNegativeModules(
			options.safeZoneModules,
			DEFAULT_IMAGE_SAFE_ZONE_MODULES,
		),
	);
	const moduleSize = context.moduleSize;
	const availableMargin = Math.max(0, (qrSpan - pixelSize) / 2);
	const paddingPx = Math.min(paddingModules * moduleSize, availableMargin);
	const safeZonePx = Math.min(safeZoneModules * moduleSize, availableMargin);
	const backgroundWidth = pixelSize + paddingPx * 2;
	const safeZoneWidth = pixelSize + safeZonePx * 2;
	const centerWithinQr = (span: number): number =>
		context.qrOffset + (qrSpan - span) / 2;
	const imageX = centerWithinQr(pixelSize);
	const imageY = centerWithinQr(pixelSize);
	const backgroundX = centerWithinQr(backgroundWidth);
	const backgroundY = centerWithinQr(backgroundWidth);
	const safeZoneX = centerWithinQr(safeZoneWidth);
	const safeZoneY = centerWithinQr(safeZoneWidth);

	const shape = sanitizeImageShape(options.shape);
	const preserveAspectRatio = sanitizePreserveAspectRatio(
		options.preserveAspectRatio,
	);
	const opacity = sanitizeOpacity(options.opacity);

	// Mirrors qr-code-styling: modules under the image are removed unless
	// explicitly kept, in which case they stay visible behind it.
	const hideBackgroundDots = options.hideBackgroundDots !== false;
	// Keeping the dots implies they should show through transparent parts
	// of the image, so the plate defaults off in that case.
	const hideBackground = options.hideBackground ?? !hideBackgroundDots;
	const shouldRenderBackground = !hideBackground;
	const backgroundColor = options.backgroundColor ?? "#ffffff";
	const imageCornerRadius =
		shape === "rounded"
			? sanitizeCornerRadius(options.cornerRadius, pixelSize)
			: undefined;
	const backgroundCornerRadius =
		shape === "rounded"
			? sanitizeCornerRadius(options.cornerRadius, backgroundWidth)
			: undefined;

	let clipPathId: string | undefined;
	if (shape !== "square") {
		const clipId = context.defs.nextId("image-clip");
		clipPathId = clipId;
		context.defs.add(
			`<clipPath id="${clipId}">${createImageShapeElement({
				shape,
				x: imageX,
				y: imageY,
				width: pixelSize,
				height: pixelSize,
				cornerRadius: imageCornerRadius,
			})}</clipPath>`,
		);
	}

	return {
		source: options.source,
		altText: options.altText,
		width: pixelSize,
		height: pixelSize,
		x: imageX,
		y: imageY,
		background: shouldRenderBackground
			? {
					x: backgroundX,
					y: backgroundY,
					width: backgroundWidth,
					height: backgroundWidth,
					fill: backgroundColor,
					cornerRadius: backgroundCornerRadius,
					shape,
				}
			: undefined,
		safeZoneRect: hideBackgroundDots
			? {
					x: safeZoneX,
					y: safeZoneY,
					width: safeZoneWidth,
					height: safeZoneWidth,
				}
			: undefined,
		paddingModules,
		safeZoneModules,
		hideBackgroundDots,
		hideBackground,
		scale: pixelSize / qrSpan,
		pixelSize,
		shape,
		cornerRadius: imageCornerRadius,
		backgroundColor: shouldRenderBackground ? backgroundColor : undefined,
		clipPathId,
		opacity,
		preserveAspectRatio,
	};
};

const sanitizeImageScale = (value: number | undefined): number => {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return DEFAULT_IMAGE_SCALE;
	}
	const clamped = Math.max(MIN_IMAGE_SCALE, Math.min(MAX_IMAGE_SCALE, value));
	return clamped;
};

const sanitizeImagePixelSize = (
	pixelSize: number | undefined,
	qrSpan: number,
	scale: number,
): number => {
	if (typeof pixelSize === "number" && Number.isFinite(pixelSize)) {
		if (pixelSize <= 0) return 0;
		return Math.min(pixelSize, qrSpan);
	}
	const resolved = qrSpan * scale;
	return Math.min(Math.max(resolved, qrSpan * MIN_IMAGE_SCALE), qrSpan);
};

const sanitizeNonNegativeModules = (
	value: number | undefined,
	fallback: number,
): number => {
	if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
		return fallback;
	}
	return value;
};

const sanitizeImageShape = (shape: ImageShape | undefined): ImageShape => {
	if (shape === "square" || shape === "rounded" || shape === "circle") {
		return shape;
	}
	return DEFAULT_IMAGE_SHAPE;
};

const sanitizeCornerRadius = (
	value: number | undefined,
	size: number,
): number | undefined => {
	if (size <= 0) return undefined;
	const maxRadius = size / 2;
	if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
		return Math.min(value, maxRadius);
	}
	return Math.min(maxRadius, size * DEFAULT_IMAGE_CORNER_RADIUS_RATIO);
};

const sanitizeOpacity = (value: number | undefined): number => {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return DEFAULT_IMAGE_OPACITY;
	}
	if (value <= 0) return 0;
	if (value >= 1) return 1;
	return value;
};

const sanitizePreserveAspectRatio = (value: string | undefined): string => {
	if (!hasContent(value)) return "xMidYMid meet";
	return value.trim();
};

const createImageShapeElement = ({
	shape,
	x,
	y,
	width,
	height,
	cornerRadius,
	fill,
}: {
	shape: ImageShape;
	x: number;
	y: number;
	width: number;
	height: number;
	cornerRadius?: number;
	fill?: string;
}): string => {
	const fillAttr = hasContent(fill)
		? ` fill="${escapeAttribute(fill!)}"`
		: "";
	switch (shape) {
		case "circle": {
			const radius = Math.min(width, height) / 2;
			const cx = x + width / 2;
			const cy = y + height / 2;
			return `<circle cx="${cx}" cy="${cy}" r="${radius}"${fillAttr} />`;
		}
		case "rounded": {
			const resolvedRadius =
				typeof cornerRadius === "number" ? cornerRadius : 0;
			return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${resolvedRadius}" ry="${resolvedRadius}"${fillAttr} />`;
		}
		default:
			return `<rect x="${x}" y="${y}" width="${width}" height="${height}"${fillAttr} />`;
	}
};

const isPointInsideRect = (
	x: number,
	y: number,
	rect: { x: number; y: number; width: number; height: number },
): boolean => {
	return (
		x >= rect.x &&
		x <= rect.x + rect.width &&
		y >= rect.y &&
		y <= rect.y + rect.height
	);
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

const getFinderOrigins = (size: number): { row: number; col: number }[] => [
	{ row: 0, col: 0 },
	{ row: 0, col: size - FINDER_PATTERN_SIZE },
	{ row: size - FINDER_PATTERN_SIZE, col: 0 },
];

const getCornerModuleType = (
	row: number,
	col: number,
	size: number,
): ModuleRegion => {
	for (const origin of getFinderOrigins(size)) {
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

const sanitizeQrShape = (shape: QrShape | undefined): QrShape =>
	shape === "circle" || shape === "square" ? shape : DEFAULT_QR_SHAPE;

// Folds the matrix into a 32-bit seed so each code gets its own (but
// repeatable) decoration pattern.
const hashMatrix = (matrix: QrMatrix): number => {
	let hash = 0x811c9dc5;
	for (let r = 0; r < matrix.size; r++) {
		for (let c = 0; c < matrix.size; c++) {
			hash = Math.imul(hash ^ (matrix.values[r][c] ?? 0), 0x01000193);
		}
	}
	return hash;
};

// Deterministic ~50% coin flip per position, so decoration looks like QR
// data without copying real modules (which could mimic finder patterns).
const isDecorationDark = (seed: number, r: number, c: number): boolean => {
	let h = seed ^ Math.imul(r, 0x85ebca6b) ^ Math.imul(c, 0xc2b2ae35);
	h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
	h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
	h ^= h >>> 16;
	return (h & 1) === 1;
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

