import type { MaskId, QrMatrix } from "./types";

/** ISO/IEC 18004 mask predicates (r,c are zero-based). */
export const maskPredicate = (
	maskId: MaskId,
): ((r: number, c: number) => boolean) => {
	switch (maskId) {
		case 0:
			return (r, c) => ((r + c) & 1) === 0;
		case 1:
			return (r) => (r & 1) === 0;
		case 2:
			return (_r, c) => c % 3 === 0;
		case 3:
			return (r, c) => (r + c) % 3 === 0;
		case 4:
			return (r, c) => (((r >> 1) + Math.floor(c / 3)) & 1) === 0;
		case 5:
			return (r, c) => {
				const p = r * c;
				return (p % 2) + (p % 3) === 0;
			};
		case 6:
			return (r, c) => {
				const p = r * c;
				return ((p % 2) + (p % 3)) % 2 === 0;
			};
		case 7:
			return (r, c) => (((r + c) & 1) + ((r * c) % 3)) % 2 === 0;
		default: {
			const _exhaustive: never = maskId;
			return (_r, _c) => false;
		}
	}
};

/**
 * Apply the given mask to a matrix, toggling only non-reserved (data) modules.
 * Returns a NEW matrix object; does not mutate the input.
 */
export const applyMask = (matrix: QrMatrix, maskId: MaskId): QrMatrix => {
	const predicate = maskPredicate(maskId);
	const size = matrix.size;
	const newValues: Array<Array<0 | 1 | null>> = new Array(size);

	for (let r = 0; r < size; r++) {
		const row: Array<0 | 1 | null> = new Array(size);
		for (let c = 0; c < size; c++) {
			const value = matrix.values[r][c];

			if (matrix.reserved[r][c]) {
				row[c] = value;
				continue;
			}

			if (value === 0 || value === 1) {
				row[c] = predicate(r, c) ? ((value ^ 1) as 0 | 1) : value;
			} else {
				row[c] = value;
			}
		}
		newValues[r] = row;
	}

	return {
		size: matrix.size,
		values: newValues,
		reserved: matrix.reserved,
	};
};

export const isDataCell = (matrix: QrMatrix, row: number, col: number): boolean =>
	!matrix.reserved[row][col];
