import type { EccLevel, VersionNumber } from "../types";
import type { MaskId, QrMatrix } from "./types";
import { applyMask } from "./apply";
import { scoreMatrix } from "./score";
import { applyFormatInfo } from "./format-info";
import { writeVersionInfoBits } from "./version-info";
import { shouldApplyVersionInfo } from "../matrix/version";

export interface ChooseBestMaskOptions {
	decorateCandidate?: (matrix: QrMatrix, maskId: MaskId) => void;
}

const inferVersionFromSize = (size: number): VersionNumber => {
	const version = (size - 17) / 4;
	if (!Number.isInteger(version) || version < 1 || version > 40) {
		throw new Error(
			`Unable to infer QR version from matrix size ${size}. Expected 17 + 4 * version.`,
		);
	}
	return version as VersionNumber;
};

const DEFAULT_ECC: EccLevel = "L";

export const chooseBestMask = (
	matrix: QrMatrix,
	params?: { version?: VersionNumber; ecc?: EccLevel },
	opts?: ChooseBestMaskOptions,
): {
	maskId: MaskId;
	matrix: QrMatrix;
	score: number;
	formatBits: number;
} => {
	const version =
		params?.version ?? inferVersionFromSize(matrix.size);
	const ecc = params?.ecc ?? DEFAULT_ECC;
	const decorate = opts?.decorateCandidate;

	let best: {
		maskId: MaskId;
		matrix: QrMatrix;
		score: number;
		formatBits: number;
	} | null = null;

	for (let id = 0 as MaskId; id <= 7; id = (id + 1) as MaskId) {
		const masked = applyMask(matrix, id);
		const formatBits = applyFormatInfo(masked, ecc, id);
		decorate?.(masked, id);
		const score = scoreMatrix(masked);

		if (best === null || score < best.score) {
			best = { maskId: id, matrix: masked, score, formatBits };
		}
	}

	if (!best) {
		throw new Error("Failed to evaluate mask patterns.");
	}

	return best;
};

export const finalizeMatrix = (
	matrix: QrMatrix,
	version: VersionNumber,
	ecc: EccLevel,
	opts?: ChooseBestMaskOptions,
) => {
	if (shouldApplyVersionInfo(version)) {
		writeVersionInfoBits(matrix, version);
	}
	return chooseBestMask(matrix, { version, ecc }, opts);
};

export { applyMask } from "./apply";
export { scoreMatrix } from "./score";
