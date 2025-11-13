import { describe, expect, test } from "vitest";
import {
	makeFormatInfoBits,
	writeFormatInfoBits as writeFormatInfo,
} from "../src/mask/format-info";
import { buildMatrixScaffold } from "../src/matrix";

const bitsToString = (bits: number): string =>
	bits.toString(2).padStart(15, "0");

const TOP_LEFT_POSITIONS: Array<[number, number]> = [
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

const makeOtherPositions = (size: number): Array<[number, number]> => {
	const positions: Array<[number, number]> = [];
	for (let r = size - 1; r >= size - 7; r--) positions.push([r, 8]);
	for (let c = size - 8; c < size; c++) positions.push([8, c]);
	return positions;
};

describe("format info encoding", () => {
	test("known format strings for ECC L match spec constants", () => {
		const stringsByMask: Array<[number, string]> = [
			[0, "111011111000100"],
			[5, "110001100011000"],
		];

		for (const [mask, expected] of stringsByMask) {
			const bits = makeFormatInfoBits("L", mask as 0 | 5);
			expect(bitsToString(bits)).toBe(expected);
		}
	});

	test("writeFormatInfo stamps both copies with identical bits", () => {
		const m = buildMatrixScaffold(1);
		const formatBits = makeFormatInfoBits("L", 0);
		writeFormatInfo(m, formatBits);

		const leftBits = TOP_LEFT_POSITIONS.map(
			([r, c]) => m.values[r][c],
		).join("");
		const otherPositions = makeOtherPositions(m.size);
		const rightBits = otherPositions.map(
			([r, c]) => m.values[r][c],
		).join("");
		const expected = bitsToString(formatBits);

		expect(leftBits).toBe(expected);
		expect(rightBits).toBe(expected);

		for (const [r, c] of [...TOP_LEFT_POSITIONS, ...otherPositions]) {
			expect(m.reserved[r][c]).toBe(true);
		}
	});
});
