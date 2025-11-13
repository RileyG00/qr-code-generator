import { describe, expect, test } from "vitest";
import { buildMatrixScaffold } from "../../src/matrix";
import {
	makeVersionInfoBits,
	writeVersionInfoBits,
} from "../../src/mask/version-info";

const readVersionBlocks = (matrix: ReturnType<typeof buildMatrixScaffold>) => {
	const size = matrix.size;
	const start = size - 11;
	const topRight: string[] = [];
	for (let r = 0; r < 6; r++) {
		for (let c = start; c < start + 3; c++) {
			topRight.push(String(matrix.values[r][c]));
		}
	}

	const bottomLeft: string[] = [];
	for (let i = 0; i < 18; i++) {
		const row = Math.floor(i / 3);
		const col = start + (i % 3);
		bottomLeft.push(String(matrix.values[col][row]));
	}

	return {
		topRight: topRight.join(""),
		bottomLeft: bottomLeft.join(""),
	};
};

const toRowMajorBitString = (bits: number): string =>
	Array.from({ length: 18 }, (_, idx) =>
		((bits >> idx) & 1) === 1 ? "1" : "0",
	).join("");

describe("version info placement", () => {
	test("version 22 writes the expected 18-bit pattern in both locations", () => {
		const version = 22;
		const expectedBits = toRowMajorBitString(makeVersionInfoBits(version));
		const matrix = buildMatrixScaffold(version);
		writeVersionInfoBits(matrix, version);

		const { topRight, bottomLeft } = readVersionBlocks(matrix);
		expect(topRight).toBe(expectedBits);
		expect(bottomLeft).toBe(expectedBits);
	});
});
