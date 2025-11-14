import { describe, expect, test } from "vitest";
import { encodeToMatrix, generateQrCode } from "../src";
import { makeFormatInfoBits } from "../src/mask/format-info";

const formatPositionsLeft: Array<[number, number]> = [
	[8, 0],
	[8, 1],
	[8, 2],
	[8, 3],
	[8, 4],
	[8, 5],
	[8, 7],
	[8, 8],
	[7, 8],
	[5, 8],
	[4, 8],
	[3, 8],
	[2, 8],
	[1, 8],
	[0, 8],
];

const formatPositionsRight = (size: number): Array<[number, number]> => {
	const positions: Array<[number, number]> = [];
	for (let r = size - 1; r >= size - 7; r--) positions.push([r, 8]);
	for (let c = size - 8; c < size; c++) positions.push([8, c]);
	return positions;
};

const bitsToString = (bits: number): string =>
	bits.toString(2).padStart(15, "0");

describe("encodeToMatrix version 1", () => {
	test("produces a fully populated matrix with format info", () => {
		const { matrix, maskId, formatBits } = encodeToMatrix("HELLO", {
			version: 1,
			ecc: "L",
			mode: "byte",
		});
		expect(matrix.size).toBe(21);
		expect(formatBits).toBe(makeFormatInfoBits("L", maskId));

		for (let r = 0; r < matrix.size; r++) {
			for (let c = 0; c < matrix.size; c++) {
				expect(matrix.values[r][c]).not.toBeNull();
			}
		}

		const expected = bitsToString(formatBits);
		const leftBits = formatPositionsLeft
			.map(([r, c]) => matrix.values[r][c])
			.join("");
		const rightBits = formatPositionsRight(matrix.size)
			.map(([r, c]) => matrix.values[r][c])
			.join("");
		expect(leftBits).toBe(expected);
		expect(rightBits).toBe(expected);
	});

	test("generateQrCode returns svg output alongside matrix metadata", () => {
		const result = generateQrCode("HELLO", {
			version: 1,
			ecc: "L",
			mode: "byte",
		});
		expect(result.matrix.size).toBe(21);
		expect(result.svg).toContain("<svg");
		expect(result.svg).toContain("</svg>");
		expect(result.svg.length).toBeGreaterThan(20);
	});
});
