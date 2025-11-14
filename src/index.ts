import { prepareCodewords as prepareGenericCodewords } from "./encoder";
import type { EccLevel, QRCodewords, QROptions, VersionNumber } from "./types";
import { buildMatrix } from "./matrix";
import { finalizeMatrix } from "./mask";
import type { MaskId, QrMatrix } from "./mask/types";
import { renderSvg, type SvgRenderOptions } from "./render/svg";

export interface EncodeMatrixResult {
	version: VersionNumber;
	ecc: EccLevel;
	maskId: MaskId;
	formatBits: number;
	matrix: QrMatrix;
}

export const prepareCodewords = prepareGenericCodewords;

export const encodeToMatrix = (
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

export const encodeToSvg = (
	input: string,
	opts?: QROptions,
	renderOptions?: SvgRenderOptions,
): string => {
	const { matrix } = encodeToMatrix(input, opts);
	return renderSvg(matrix, renderOptions);
};

export interface GenerateQrCodeResult extends EncodeMatrixResult {
	svg: string;
}

export const generateQrCode = (
	input: string,
	opts?: QROptions,
	renderOptions?: SvgRenderOptions,
): GenerateQrCodeResult => {
	const result = encodeToMatrix(input, opts);
	const svg = renderSvg(result.matrix, renderOptions);
	return { ...result, svg };
};

export { renderSvg, type SvgRenderOptions } from "./render/svg";
