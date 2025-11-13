import { describe, expect, test } from "vitest";
import { encodeToMatrix, prepareCodewords } from "../../../src";
import { encodeUtf8 } from "../../../src/encoder/byte-mode";
import { makeDataCodewords } from "../../../src/encoder/data-codewords";
import { getVersionCapacity } from "../../../src/metadata/capacity";

const V1_INFO = getVersionCapacity(1);
const V1_Q = V1_INFO.levels.Q;
const MAX_V1_Q_PAYLOAD = Math.floor((V1_Q.dataCodewords * 8 - 12) / 8);

const encodeV1QData = (text: string): number[] =>
	Array.from(makeDataCodewords(encodeUtf8(text), V1_INFO, "Q"));

describe("V1-Q byte-mode payload handling", () => {
	test("11-byte payload fills all 13 data codewords", () => {
		const payload = "A".repeat(MAX_V1_Q_PAYLOAD);
		const codewords = encodeV1QData(payload);

		expect(MAX_V1_Q_PAYLOAD).toBe(11);
		expect(codewords).toHaveLength(V1_Q.dataCodewords);

		const plan = prepareCodewords(payload, { version: 1, ecc: "Q" });
		expect(plan.version).toBe(1);
		expect(plan.ecc).toBe("Q");
		expect(plan.dataCodewords.length).toBe(V1_Q.dataCodewords);
		expect(plan.eccCodewords.length).toBe(
			V1_Q.numBlocks * V1_Q.eccCodewordsPerBlock,
		);
	});

	test("12-byte payload does not fit in V1-Q", () => {
		const overCapacity = "B".repeat(MAX_V1_Q_PAYLOAD + 1);
		expect(() =>
			prepareCodewords(overCapacity, { version: 1, ecc: "Q" }),
		).toThrow(/does not fit/i);
	});
});

describe("V1-Q matrix selection", () => {
	test("encodeToMatrix stays within version 1 when possible", () => {
		const result = encodeToMatrix("Short text", { ecc: "Q" });
		expect(result.version).toBe(1);
		expect(result.ecc).toBe("Q");
	});

	test("forcing version 1 fails once payload exceeds Q capacity", () => {
		const payload = "C".repeat(MAX_V1_Q_PAYLOAD + 2);
		expect(() =>
			encodeToMatrix(payload, { ecc: "Q", minVersion: 1, maxVersion: 1 }),
		).toThrow(/no version/i);
	});
});
