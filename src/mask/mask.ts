// Step 5A — Mask predicates + applyMask(matrix, maskId)
// Coordinates are zero-based: r = row (0..size-1), c = column (0..size-1)

import type { MaskId, QrMatrix } from "./types";

/** ISO/IEC 18004 mask predicates (r,c are zero-based). */
export const maskPredicate = (
	maskId: MaskId,
): ((r: number, c: number) => boolean) => {
	switch (maskId) {
		case 0:
			// (r + c) mod 2 == 0
			return (r, c) => ((r + c) & 1) === 0;
		case 1:
			// r mod 2 == 0
			return (r, _c) => (r & 1) === 0;
		case 2:
			// c mod 3 == 0
			return (_r, c) => c % 3 === 0;
		case 3:
			// (r + c) mod 3 == 0
			return (r, c) => (r + c) % 3 === 0;
		case 4:
			// (floor(r/2) + floor(c/3)) mod 2 == 0
			return (r, c) => (((r >> 1) + Math.floor(c / 3)) & 1) === 0;
		case 5:
			// (r*c) mod 2 + (r*c) mod 3 == 0
			return (r, c) => {
				const p: number = r * c;
				return (p % 2) + (p % 3) === 0;
			};
		case 6:
			// ((r*c) mod 2 + (r*c) mod 3) mod 2 == 0
			return (r, c) => {
				const p: number = r * c;
				return ((p % 2) + (p % 3)) % 2 === 0;
			};
		case 7:
			// ((r + c) mod 2 + (r*c) mod 3) mod 2 == 0
			return (r, c) => (((r + c) & 1) + ((r * c) % 3)) % 2 === 0;
		default: {
			// Exhaustiveness guard
			const _exhaustive: never = maskId;
			return (_r, _c) => false;
		}
	}
};

/**
 * Apply the given mask to a matrix, toggling only non-reserved (data) modules.
 * Returns a NEW matrix object; does not mutate the input.
 */
export const applyMask = (m: QrMatrix, maskId: MaskId): QrMatrix => {
	const pred = maskPredicate(maskId);

	const size: number = m.size;
	const newValues: Array<Array<0 | 1 | null>> = new Array(size);

	for (let r: number = 0; r < size; r++) {
		const row: Array<0 | 1 | null> = new Array(size);
		for (let c: number = 0; c < size; c++) {
			const v: 0 | 1 | null = m.values[r][c];

			// If reserved, pass through untouched (including null if any slipped through)
			if (m.reserved[r][c]) {
				row[c] = v;
				continue;
			}

			// Only data cells get toggled when predicate is true.
			// If v is null (shouldn't happen at mask time), just copy it to be safe.
			if (v === 0 || v === 1) {
				row[c] = pred(r, c) ? ((v ^ 1) as 0 | 1) : v;
			} else {
				row[c] = v;
			}
		}
		newValues[r] = row;
	}

	return {
		size: m.size,
		values: newValues,
		reserved: m.reserved,
	};
};

/** Convenience helper — true if cell is a data module (i.e., not reserved). */
export const isDataCell = (m: QrMatrix, r: number, c: number): boolean =>
	!m.reserved[r][c];

export type { MaskId, QrMatrix } from "./types";
