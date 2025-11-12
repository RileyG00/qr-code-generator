import { describe, test, expect } from "vitest";
import { buildScaffoldV1 } from "../src/matrix/build";

describe("V1 scaffold (function patterns only)", () => {
	test("matrix is 21x21 and mostly null before data placement", () => {
		const m = buildScaffoldV1();
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
		const m = buildScaffoldV1();

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

	test("timing patterns alternate along row 6 and column 6 where not covered", () => {
		const m = buildScaffoldV1();

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

	test("dark module at (13,8) is set black and reserved", () => {
		const m = buildScaffoldV1();
		expect(m.values[13][8]).toBe(1);
		expect(m.reserved[13][8]).toBe(true);
	});

	test("format info areas are reserved but not yet written (values null)", () => {
		const m = buildScaffoldV1();
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
});
