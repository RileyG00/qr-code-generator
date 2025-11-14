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
	DEFAULT_ROTATION,
} from "../styleTypes";

export interface SvgRenderOptions {
	margin?: number;
	size?: number;
	moduleSize?: number;
	styling?: DesignStyleOptions;
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
const MIN_IMAGE_SCALE = 0.05;
const MAX_IMAGE_SCALE = 0.4;
const DEFAULT_IMAGE_CORNER_RADIUS_RATIO = 0.25;

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
	safeZoneRect: { x: number; y: number; width: number; height: number };
	paddingModules: number;
	safeZoneModules: number;
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
	const offset = marginModules * moduleSize;
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
	for (let r = 0; r < matrix.size; r++) {
		for (let c = 0; c < matrix.size; c++) {
			if (matrix.values[r][c] !== 1) continue;
			const x = offset + c * moduleSize;
			const y = offset + r * moduleSize;
			if (
				safeZoneRect &&
				isPointInsideRect(
					x + moduleSize / 2,
					y + moduleSize / 2,
					safeZoneRect,
				)
			) {
				continue;
			}
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

	const shouldRenderBackground = options.hideBackground !== true;
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
		safeZoneRect: {
			x: safeZoneX,
			y: safeZoneY,
			width: safeZoneWidth,
			height: safeZoneWidth,
		},
		paddingModules,
		safeZoneModules,
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

