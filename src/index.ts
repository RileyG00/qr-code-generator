import { prepareCodewords as prepareGenericCodewords } from "./encoder";
import { QROptions, QRCodewords } from "./types";
import { V1_SIZE } from "./constants/v1l";
import { buildMatrixV1L_Unmasked } from "./matrix/v1l";
import { chooseBestMask } from "./mask/mask-score";
import { makeFormatInfoBits, writeFormatInfo } from "./matrix/format";
import { writeVersionInfo } from "./matrix/version";
import type { MaskId, QrMatrix } from "./mask/types";

export const prepareCodewords = prepareGenericCodewords;

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
	writeVersionInfo(baseMatrix, prepared.version);

	const decorator = (candidate: QrMatrix, maskId: MaskId) => {
		const bits = makeFormatInfoBits(prepared.ecc, maskId);
		writeFormatInfo(candidate, bits);
	};

	const { maskId, matrix, score } = chooseBestMask(baseMatrix as QrMatrix, {
		decorateCandidate: decorator,
	});

	const formatBits = makeFormatInfoBits(prepared.ecc, maskId);
	writeFormatInfo(matrix, formatBits);

return { matrix, maskId, formatBits, score };
};

export { renderSvg, type SvgRenderOptions } from "./render/svg";
