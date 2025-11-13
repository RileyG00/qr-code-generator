import { describe, test, expect } from "vitest";
import { buildMatrixScaffold } from "../src/matrix";

const FINDER_TEMPLATE: (0 | 1)[][] = [
	[1, 1, 1, 1, 1, 1, 1],
	[1, 0, 0, 0, 0, 0, 1],
	[1, 0, 1, 1, 1, 0, 1],
	[1, 0, 1, 1, 1, 0, 1],
	[1, 0, 1, 1, 1, 0, 1],
	[1, 0, 0, 0, 0, 0, 1],
	[1, 1, 1, 1, 1, 1, 1],
];

describe("V1 scaffold (function patterns only)", () => {
	test("matrix is 21x21 and mostly null before data placement", () => {
		const m = buildMatrixScaffold(1);
		expect(m.size).toBe(21);
		// Some cells are set (finders/timing/dark), but most are still null or reserved-only
		const total = m.size * m.size;
		let setCount = 0;
		let reservedOnlyCount = 0;
		for (let r = 0; r < m.size; r++) {
			for (let c = 0; c < m.size; c++) {
				if (m.values[r][c] !== null) setCount++;
				if (m.reserved[r][c] && m.values[r][c] === null)
					reservedOnlyCount++;
			}
		}
		expect(setCount).toBeGreaterThan(0);
		expect(reservedOnlyCount).toBeGreaterThan(0);
		expect(setCount + reservedOnlyCount).toBeLessThan(total); // many data slots remain
	});

	test("finder patterns present with white separators", () => {
		const m = buildMatrixScaffold(1);

		// helper to assert a 7x7 finder at (top,left) and a white ring around it
		const assertFinder = (top: number, left: number) => {
			// 7x7 bullseye (we'll just check outer border and center row for brevity)
			for (let i = 0; i < 7; i++) {
				// top and bottom rows are black
				expect(m.values[top][left + i]).toBe(1);
				expect(m.values[top + 6][left + i]).toBe(1);
				// left and right cols are black
				expect(m.values[top + i][left]).toBe(1);
				expect(m.values[top + i][left + 6]).toBe(1);
			}
			// White separator ring outside the 7x7 where in-bounds
			// For top-left finder: row top+7, cols left..left+7 and col left+7, rows top..top+7
			const rowSep = top + 7,
				colSep = left + 7;

			// Bottom separator row: columns left..left+7, but guard bounds
			for (let c = left; c <= left + 7; c++) {
				if (rowSep >= 0 && rowSep < m.size && c >= 0 && c < m.size) {
					expect(m.values[rowSep][c]).toBe(0);
					expect(m.reserved[rowSep][c]).toBe(true);
				}
			}

			// Right separator column: rows top..top+7, but guard bounds
			for (let r = top; r <= top + 7; r++) {
				if (r >= 0 && r < m.size && colSep >= 0 && colSep < m.size) {
					expect(m.values[r][colSep]).toBe(0);
					expect(m.reserved[r][colSep]).toBe(true);
				}
			}
		};

		assertFinder(0, 0); // top-left
		assertFinder(0, 21 - 7); // top-right
		assertFinder(21 - 7, 0); // bottom-left
	});

	test("finder bodies match the 7x7 template and are all reserved", () => {
		const m = buildMatrixScaffold(1);
		const coords: Array<[number, number]> = [
			[0, 0],
			[0, 21 - 7],
			[21 - 7, 0],
		];
		for (const [top, left] of coords) {
			for (let r = 0; r < 7; r++) {
				for (let c = 0; c < 7; c++) {
					expect(m.values[top + r][left + c]).toBe(
						FINDER_TEMPLATE[r][c],
					);
					expect(m.reserved[top + r][left + c]).toBe(true);
				}
			}
		}
	});

	test("timing patterns alternate along row 6 and column 6 where not covered", () => {
		const m = buildMatrixScaffold(1);

		// Horizontal timing exists only at row 6, cols 8..12 on V1
		for (let c = 8; c <= m.size - 9; c++) {
			// 8..12
			const expected: 0 | 1 = c % 2 === 0 ? 1 : 0;
			expect(m.reserved[6][c]).toBe(true);
			expect(m.values[6][c]).toBe(expected);
		}

		// Vertical timing exists only at col 6, rows 8..12 on V1
		for (let r = 8; r <= m.size - 9; r++) {
			// 8..12
			const expected: 0 | 1 = r % 2 === 0 ? 1 : 0;
			expect(m.reserved[r][6]).toBe(true);
			expect(m.values[r][6]).toBe(expected);
		}
	});

	test("timing placement does not overwrite finder or separator reservations", () => {
		const m = buildMatrixScaffold(1);

		// Row 6 just outside the top-left finder should remain white separator
		expect(m.values[6][7]).toBe(0);
		expect(m.reserved[6][7]).toBe(true);

		// First actual timing bit to the right of the separator should be dark (col 8, even)
		expect(m.values[6][8]).toBe(1);
		expect(m.reserved[6][8]).toBe(true);

		// Approaching the top-right finder, separator column (col 13) stays white
		expect(m.values[6][13]).toBe(0);
		expect(m.reserved[6][13]).toBe(true);

		// Column 6 below the top-left finder should mirror the same behavior
		expect(m.values[7][6]).toBe(0); // separator row
		expect(m.reserved[7][6]).toBe(true);
		expect(m.values[8][6]).toBe(1); // first vertical timing after separator (row 8 even)
		expect(m.reserved[8][6]).toBe(true);
	});

	test("dark module at (13,8) is set black and reserved", () => {
		const m = buildMatrixScaffold(1);
		expect(m.values[13][8]).toBe(1);
		expect(m.reserved[13][8]).toBe(true);
	});

	test("format info areas are reserved but not yet written (values null)", () => {
		const m = buildMatrixScaffold(1);
		const n = m.size;

		// Top-left cross
		for (let c = 0; c <= 8; c++) {
			if (c === 6) continue;
			expect(m.reserved[8][c]).toBe(true);
			expect(m.values[8][c]).toBeNull();
		}
		for (let r = 0; r <= 8; r++) {
			if (r === 6) continue;
			expect(m.reserved[r][8]).toBe(true);
			expect(m.values[r][8]).toBeNull();
		}

		// Top-right band row 8, cols n-8..n-1
		for (let c = n - 8; c < n; c++) {
			expect(m.reserved[8][c]).toBe(true);
			expect(m.values[8][c]).toBeNull();
		}

		// Bottom-left band col 8, rows n-7..n-1
		for (let r = n - 7; r < n; r++) {
			expect(m.reserved[r][8]).toBe(true);
			expect(m.values[r][8]).toBeNull();
		}
	});

	test("regular data modules remain unreserved and null prior to data placement", () => {
		const m = buildMatrixScaffold(1);
		const samples: Array<[number, number]> = [
			[10, 10],
			[12, 15],
			[15, 12],
		];
		for (const [r, c] of samples) {
			expect(m.reserved[r][c]).toBe(false);
			expect(m.values[r][c]).toBeNull();
		}
	});
});
