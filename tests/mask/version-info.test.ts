import { describe, expect, test } from "vitest";
import { buildMatrixScaffold } from "../../src/matrix";
import { makeVersionInfoBits, writeVersionInfoBits } from "../../src/mask/version-info";

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
	for (let r = start; r < start + 3; r++) {
		for (let c = 0; c < 6; c++) {
			bottomLeft.push(String(matrix.values[r][c]));
		}
	}

	return {
		topRight: topRight.join(""),
		bottomLeft: bottomLeft.join(""),
	};
};

describe("version info placement", () => {
	test("version 22 writes the expected 18-bit pattern in both locations", () => {
		const version = 22;
		const expectedBits = makeVersionInfoBits(version)
			.toString(2)
			.padStart(18, "0");
		const matrix = buildMatrixScaffold(version);
		writeVersionInfoBits(matrix, version);

		const { topRight, bottomLeft } = readVersionBlocks(matrix);
		expect(topRight).toBe(expectedBits);
		expect(bottomLeft).toBe(expectedBits);
	});
});
