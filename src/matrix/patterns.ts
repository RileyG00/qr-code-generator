import type { VersionCapacity } from "../metadata/capacity";
import { reserveFormatInfo } from "./format";
import { reserveVersionInfo } from "./version";
import { Matrix, Module, setModule } from "./types";

const FINDER_PATTERN: Module[][] = [
	[1, 1, 1, 1, 1, 1, 1],
	[1, 0, 0, 0, 0, 0, 1],
	[1, 0, 1, 1, 1, 0, 1],
	[1, 0, 1, 1, 1, 0, 1],
	[1, 0, 1, 1, 1, 0, 1],
	[1, 0, 0, 0, 0, 0, 1],
	[1, 1, 1, 1, 1, 1, 1],
];

const ALIGNMENT_PATTERN: Module[][] = [
	[1, 1, 1, 1, 1],
	[1, 0, 0, 0, 1],
	[1, 0, 1, 0, 1],
	[1, 0, 0, 0, 1],
	[1, 1, 1, 1, 1],
];

const placeFinderAt = (matrix: Matrix, top: number, left: number): void => {
	for (let r = 0; r < 7; r++) {
		for (let c = 0; c < 7; c++) {
			setModule(matrix, top + r, left + c, FINDER_PATTERN[r][c], true);
		}
	}

	// White separator ring (one module wide) around finder
	for (let r = -1; r <= 7; r++) {
		for (let c = -1; c <= 7; c++) {
			const rr = top + r;
			const cc = left + c;
			const onBorder = r === -1 || r === 7 || c === -1 || c === 7;
			if (
				onBorder &&
				rr >= 0 &&
				rr < matrix.size &&
				cc >= 0 &&
				cc < matrix.size
			) {
				setModule(matrix, rr, cc, 0, true);
			}
		}
	}
};

export const placeFinderPatterns = (matrix: Matrix): void => {
	placeFinderAt(matrix, 0, 0);
	placeFinderAt(matrix, 0, matrix.size - 7);
	placeFinderAt(matrix, matrix.size - 7, 0);
};

export const placeTimingPatterns = (matrix: Matrix): void => {
	// Horizontal timing (row 6)
	for (let column = 0; column < matrix.size; column++) {
		if (matrix.reserved[6][column]) continue;
		const bit: Module = column % 2 === 0 ? 1 : 0;
		setModule(matrix, 6, column, bit, true);
	}

	// Vertical timing (column 6)
	for (let row = 0; row < matrix.size; row++) {
		if (matrix.reserved[row][6]) continue;
		const bit: Module = row % 2 === 0 ? 1 : 0;
		setModule(matrix, row, 6, bit, true);
	}
};

const placeAlignmentAt = (
	matrix: Matrix,
	centerRow: number,
	centerCol: number,
): void => {
	for (let r = -2; r <= 2; r++) {
		for (let c = -2; c <= 2; c++) {
			const value = ALIGNMENT_PATTERN[r + 2][c + 2];
			setModule(matrix, centerRow + r, centerCol + c, value, true);
		}
	}
};

export const placeAlignmentPatterns = (
	matrix: Matrix,
	info: VersionCapacity,
): void => {
	const positions = info.alignments;
	if (!positions || positions.length === 0) return;

	for (let rowIdx = 0; rowIdx < positions.length; rowIdx++) {
		for (let colIdx = 0; colIdx < positions.length; colIdx++) {
			// Skip the three finder corners
			const skipTopLeft = rowIdx === 0 && colIdx === 0;
			const skipTopRight = rowIdx === 0 && colIdx === positions.length - 1;
			const skipBottomLeft =
				rowIdx === positions.length - 1 && colIdx === 0;
			if (skipTopLeft || skipTopRight || skipBottomLeft) continue;

			const r = positions[rowIdx];
			const c = positions[colIdx];
			if (r >= matrix.size || c >= matrix.size) continue;
			placeAlignmentAt(matrix, r, c);
		}
	}
};

export const placeDarkModule = (matrix: Matrix, version: number): void => {
	const row = 4 * version + 9;
	const col = 8;
	if (row < matrix.size) {
		setModule(matrix, row, col, 1, true);
	}
};

export const reserveFormatAndVersionInfo = (
	matrix: Matrix,
	version: number,
): void => {
	reserveFormatInfo(matrix);
	reserveVersionInfo(matrix, version);
};
