import { describe, expect, test } from "vitest";
import { encodeToMatrix, prepareCodewords } from "../../../src";
import { encodeUtf8 } from "../../../src/encoder/byte-mode";
import { makeDataCodewords } from "../../../src/encoder/data-codewords";
import { getVersionCapacity } from "../../../src/metadata/capacity";

const V1_INFO = getVersionCapacity(1);
const V1_M = V1_INFO.levels.M;
const MAX_V1_M_PAYLOAD = Math.floor((V1_M.dataCodewords * 8 - 12) / 8);

const encodeV1MData = (text: string): number[] => {
	const bytes = encodeUtf8(text);
	return Array.from(
		makeDataCodewords(
			{ mode: "byte", bytes, length: bytes.length },
			V1_INFO,
			"M",
		),
	);
};

describe("V1-M byte-mode data and ECC codewords", () => {
	test("14-byte payload uses the full 16 data codewords", () => {
		const payload = "A".repeat(MAX_V1_M_PAYLOAD);
		const codewords = encodeV1MData(payload);

		expect(MAX_V1_M_PAYLOAD).toBe(14);
		expect(codewords).toHaveLength(V1_M.dataCodewords);

		const plan = prepareCodewords(payload, { version: 1, ecc: "M", mode: "byte" });
		expect(plan.version).toBe(1);
		expect(plan.ecc).toBe("M");
		expect(plan.dataCodewords.length).toBe(V1_M.dataCodewords);
		expect(plan.eccCodewords.length).toBe(
			V1_M.numBlocks * V1_M.eccCodewordsPerBlock,
		);
	});

	test("15-byte payload overflows V1-M and should throw", () => {
		const overCapacity = "B".repeat(MAX_V1_M_PAYLOAD + 1);
		expect(() =>
			prepareCodewords(overCapacity, { version: 1, ecc: "M", mode: "byte" }),
		).toThrow(/does not fit/i);
	});
});

describe("V1-M matrix selection", () => {
	test("encodeToMatrix stays at version 1 when payload fits", () => {
		const result = encodeToMatrix("HELLO", { ecc: "M", mode: "byte" });
		expect(result.version).toBe(1);
		expect(result.ecc).toBe("M");
		expect(result.matrix.size).toBe(21);
	});

	test("encodeToMatrix promotes when payload exceeds capacity", () => {
		const payload = "C".repeat(MAX_V1_M_PAYLOAD + 5);
		const result = encodeToMatrix(payload, { ecc: "M", mode: "byte" });
		expect(result.ecc).toBe("M");
		expect(result.version).toBeGreaterThan(1);
	});
});
