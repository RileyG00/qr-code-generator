import { applyMask } from "./mask";
import type { MaskId, QrMatrix } from "./types";

/** Ensure matrix is fully populated with 0/1 (no nulls). */
const ensureBinary = (
	v: ReadonlyArray<ReadonlyArray<0 | 1 | null>>,
): ReadonlyArray<ReadonlyArray<0 | 1>> => {
	for (let r = 0; r < v.length; r++) {
		const row = v[r];
		for (let c = 0; c < row.length; c++) {
			if (row[c] !== 0 && row[c] !== 1) {
				throw new Error(
					`Matrix contains null at (${r}, ${c}) during scoring.`,
				);
			}
		}
	}
	// Now safe to assert
	return v as ReadonlyArray<ReadonlyArray<0 | 1>>;
};

/** Master scorer (sum of four ISO 18004 rules). */
export const scoreMatrix = (m: QrMatrix): number => {
	const v = ensureBinary(m.values);
	return scoreRule1(v) + scoreRule2(v) + scoreRule3(v) + scoreRule4(v);
};

// Accept nullable rows and harden inside.
export const scoreRule1 = (
	vIn: ReadonlyArray<ReadonlyArray<0 | 1 | null>>,
): number => {
	const v = ensureBinary(vIn);
	const size = v.length;
	let penalty = 0;

	const scoreRuns = (line: ReadonlyArray<0 | 1>): number => {
		let runColor: 0 | 1 = line[0];
		let runLen = 1;
		let p = 0;
		for (let i = 1; i < line.length; i++) {
			if (line[i] === runColor) runLen++;
			else {
				if (runLen >= 5) p += 3 + (runLen - 5);
				runColor = line[i];
				runLen = 1;
			}
		}
		if (runLen >= 5) p += 3 + (runLen - 5);
		return p;
	};

	for (let r = 0; r < size; r++) penalty += scoreRuns(v[r]);
	for (let c = 0; c < size; c++) {
		const col: (0 | 1)[] = new Array(size);
		for (let r = 0; r < size; r++) col[r] = v[r][c];
		penalty += scoreRuns(col);
	}
	return penalty;
};

export const scoreRule2 = (
	vIn: ReadonlyArray<ReadonlyArray<0 | 1 | null>>,
): number => {
	const v = ensureBinary(vIn);
	const size = v.length;
	let penalty = 0;
	for (let r = 0; r < size - 1; r++) {
		for (let c = 0; c < size - 1; c++) {
			const a = v[r][c];
			if (v[r][c + 1] === a && v[r + 1][c] === a && v[r + 1][c + 1] === a)
				penalty += 3;
		}
	}
	return penalty;
};

export const scoreRule3 = (
	vIn: ReadonlyArray<ReadonlyArray<0 | 1 | null>>,
): number => {
	const v = ensureBinary(vIn);
	const size = v.length;
	let penalty = 0;

	const hasPatternAt = (line: ReadonlyArray<0 | 1>, i: number): boolean => {
		if (
			i + 6 < line.length &&
			line[i] === 1 &&
			line[i + 1] === 0 &&
			line[i + 2] === 1 &&
			line[i + 3] === 1 &&
			line[i + 4] === 1 &&
			line[i + 5] === 0 &&
			line[i + 6] === 1
		) {
			let leftZeros = 0;
			for (let k = i - 1; k >= 0 && line[k] === 0 && leftZeros < 4; k--)
				leftZeros++;
			let rightZeros = 0;
			for (
				let k = i + 7;
				k < line.length && line[k] === 0 && rightZeros < 4;
				k++
			)
				rightZeros++;
			if (leftZeros >= 4 || rightZeros >= 4) return true;
		}
		if (
			i + 6 < line.length &&
			line[i] === 0 &&
			line[i + 1] === 1 &&
			line[i + 2] === 0 &&
			line[i + 3] === 0 &&
			line[i + 4] === 0 &&
			line[i + 5] === 1 &&
			line[i + 6] === 0
		) {
			let leftZeros = 0;
			for (let k = i - 1; k >= 0 && line[k] === 0 && leftZeros < 4; k--)
				leftZeros++;
			let rightZeros = 0;
			for (
				let k = i + 7;
				k < line.length && line[k] === 0 && rightZeros < 4;
				k++
			)
				rightZeros++;
			if (leftZeros >= 4 || rightZeros >= 4) return true;
		}
		return false;
	};

	const scanLine = (line: ReadonlyArray<0 | 1>): number => {
		let p = 0;
		for (let i = 0; i < line.length - 6; i++)
			if (hasPatternAt(line, i)) p += 40;
		return p;
	};

	for (let r = 0; r < size; r++) penalty += scanLine(v[r]);
	for (let c = 0; c < size; c++) {
		const col: (0 | 1)[] = new Array(size);
		for (let r = 0; r < size; r++) col[r] = v[r][c];
		penalty += scanLine(col);
	}
	return penalty;
};

export const scoreRule4 = (
	vIn: ReadonlyArray<ReadonlyArray<0 | 1 | null>>,
): number => {
	const v = ensureBinary(vIn);
	const size = v.length;
	const total = size * size;
	let dark = 0;
	for (let r = 0; r < size; r++)
		for (let c = 0; c < size; c++) if (v[r][c] === 1) dark++;
	const percent = (dark * 100) / total;
	const diff = Math.abs(percent - 50);
	return 10 * Math.floor(diff / 5);
};

export interface ChooseBestMaskOptions {
	decorateCandidate?: (matrix: QrMatrix, maskId: MaskId) => void;
}

/** Try all masks, return the lowest-penalty result. */
export const chooseBestMask = (
	m: QrMatrix,
	opts?: ChooseBestMaskOptions,
): { maskId: MaskId; matrix: QrMatrix; score: number } => {
	const decorate = opts?.decorateCandidate;

	let bestId: MaskId = 0;
	let bestMatrix: QrMatrix = applyMask(m, 0);
	decorate?.(bestMatrix, bestId);
	let bestScore = scoreMatrix(bestMatrix);

	for (let id = 1 as MaskId; id <= 7; id = (id + 1) as MaskId) {
		const masked = applyMask(m, id);
		decorate?.(masked, id);
		const s = scoreMatrix(masked);
		if (s < bestScore) {
			bestScore = s;
			bestId = id;
			bestMatrix = masked;
		}
	}

	return { maskId: bestId, matrix: bestMatrix, score: bestScore };
};
