import { prepareCodewords as prepareGenericCodewords } from "./encoder";
import type { EccLevel, QROptions, VersionNumber } from "./types";
import { buildMatrix, Matrix } from "./matrix";
import { finalizeMatrix } from "./mask";
import type { MaskId, QrMatrix } from "./mask/types";
import { renderSvg } from "./render/svg";
import type { SvgRenderOptions } from "./render/svg";
import { DesignStyleOptions, ImageOptions } from "./styleTypes";

export interface EncodeMatrixResult {
	version: VersionNumber;
	ecc: EccLevel;
	maskId: MaskId;
	formatBits: number;
	matrix: QrMatrix;
}

const prepareCodewords = prepareGenericCodewords;

const encodeToMatrix = (
	input: string,
	opts?: QROptions,
): EncodeMatrixResult => {
	const prepared = prepareCodewords(input, opts);
	const baseMatrix = buildMatrix(
		prepared.version,
		prepared.interleavedCodewords,
	);
	const { maskId, matrix, formatBits } = finalizeMatrix(
		baseMatrix as QrMatrix,
		prepared.version,
		prepared.ecc,
	);

	return {
		version: prepared.version,
		ecc: prepared.ecc,
		maskId,
		formatBits,
		matrix,
	};
};

export interface GenerateQrCodeResult extends EncodeMatrixResult {
	svg: string;
	styling: DesignStyleOptions;
}

export const generateQrCode = (
	input: string,
	opts?: QROptions,
	renderOptions?: SvgRenderOptions,
): GenerateQrCodeResult => {
	const resolvedOptions = ensureEccForImage(
		opts,
		renderOptions?.styling?.imageOptions,
	);
	const result = encodeToMatrix(input, resolvedOptions);
	const { svg, styling } = renderSvg(result.matrix, renderOptions);
	return { ...result, svg, styling };
};

export type { QROptions, EccLevel, VersionNumber, QRMode } from "./types";
export { DEFAULT_ECC } from "./metadata/capacity";
export {
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
} from "./styleTypes";
export type { MaskId, QrMatrix } from "./mask/types";
export type { Matrix, Module, MaybeModule } from "./matrix/types";
export type { SvgRenderOptions } from "./render/svg";
export {
	downloadQrCode,
	type DownloadQrCodeOptions,
	type DownloadQrCodeResult,
	type QrDownloadFormat,
} from "./download";
export type {
	GradientType,
	HexColor,
	DotShapeType,
	CornerSquareShapeType,
	CornerDotShapeType,
	Square,
	Dot,
	Rounded,
	ExtraRounded,
	Classy,
	ClassyRounded,
	DotStyle,
	CornerSquareStyle,
	CornerDotStyle,
	DotOptions,
	CornerSquareOptions,
	CornerDotOptions,
	BackgroundOptions,
	ColorSettings,
	DesignStyleOptions,
	ImageOptions,
	ImageShape,
	QrShape,
} from "./styleTypes";

const ensureEccForImage = (
	options: QROptions | undefined,
	imageOptions: ImageOptions | undefined,
): QROptions | undefined => {
	if (!imageOptions || !hasImageSource(imageOptions.source)) {
		return options;
	}
	const desiredEcc: EccLevel =
		imageOptions.scale !== undefined && imageOptions.scale >= 0.25
			? "H"
			: "Q";
	if (!options) return { ecc: desiredEcc };
	if (!options.ecc) return { ...options, ecc: desiredEcc };
	const order: Record<EccLevel, number> = { L: 0, M: 1, Q: 2, H: 3 };
	if (order[options.ecc] >= order[desiredEcc]) return options;
	return { ...options, ecc: desiredEcc };
};

const hasImageSource = (source: string | undefined): source is string =>
	typeof source === "string" && source.length > 0;
