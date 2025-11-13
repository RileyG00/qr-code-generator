import { prepareCodewords as prepareGenericCodewords } from "./encoder";
import type { EccLevel, QRCodewords, QROptions, VersionNumber } from "./types";
import { V1_SIZE } from "./constants/v1l";
import { buildMatrix } from "./matrix";
import { buildMatrixV1L_Unmasked } from "./matrix/v1l";
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

export const prepareV1L = (input: string, _opts?: QROptions): QRCodewords =>
	prepareCodewords(input, { version: 1, ecc: "L" });

export const prepareV1LWithEcc = (
	input: string,
	_opts?: QROptions,
): QRCodewords & { totalCodewords: number } => {
	const prepared = prepareV1L(input, _opts);
	return {
		...prepared,
		totalCodewords:
			prepared.interleavedCodewords.length ??
			prepared.dataCodewords.length + prepared.eccCodewords.length,
	};
};

export const getPlannedMatrixSize = (): number => V1_SIZE;

export interface QRMatrixBuildResult {
	matrix: QrMatrix;
	maskId: MaskId;
	formatBits: number;
	score: number;
}

export const buildV1LMatrix = (
	input: string,
	_opts?: QROptions,
): QRMatrixBuildResult => {
	const prepared = prepareV1L(input, _opts);
	const all =
		prepared.interleavedCodewords ??
		Uint8Array.from([
			...prepared.dataCodewords,
			...prepared.eccCodewords,
		]);
	const baseMatrix = buildMatrixV1L_Unmasked(Uint8Array.from(all));

	const { maskId, matrix, score, formatBits } = finalizeMatrix(
		baseMatrix as QrMatrix,
		prepared.version,
		prepared.ecc,
	);

	return { matrix, maskId, formatBits, score };
};

export { renderSvg, type SvgRenderOptions } from "./render/svg";
