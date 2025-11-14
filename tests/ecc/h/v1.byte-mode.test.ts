import { describe, expect, test } from "vitest";
import { generateQrCode } from "../../../src";
import { prepareCodewords } from "../../../src/encoder";
import { encodeUtf8 } from "../../../src/encoder/byte-mode";
import { makeDataCodewords } from "../../../src/encoder/data-codewords";
import { getVersionCapacity } from "../../../src/metadata/capacity";

const V1_INFO = getVersionCapacity(1);
const V1_H = V1_INFO.levels.H;
const MAX_V1_H_PAYLOAD = Math.floor((V1_H.dataCodewords * 8 - 12) / 8);

const encodeV1HData = (text: string): number[] => {
	const bytes = encodeUtf8(text);
	return Array.from(
		makeDataCodewords(
			{ mode: "byte", bytes, length: bytes.length },
			V1_INFO,
			"H",
		),
	);
};

describe("V1-H byte-mode payload handling", () => {
	test("7-byte payload fits and uses 9 data codewords", () => {
		const payload = "A".repeat(MAX_V1_H_PAYLOAD);
		const codewords = encodeV1HData(payload);

		expect(MAX_V1_H_PAYLOAD).toBe(7);
		expect(codewords).toHaveLength(V1_H.dataCodewords);

		const plan = prepareCodewords(payload, { version: 1, ecc: "H", mode: "byte" });
		expect(plan.version).toBe(1);
		expect(plan.ecc).toBe("H");
		expect(plan.dataCodewords.length).toBe(V1_H.dataCodewords);
		expect(plan.eccCodewords.length).toBe(
			V1_H.numBlocks * V1_H.eccCodewordsPerBlock,
		);
	});

	test("8-byte payload cannot fit within V1-H", () => {
		const overCapacity = "B".repeat(MAX_V1_H_PAYLOAD + 1);
		expect(() =>
			prepareCodewords(overCapacity, { version: 1, ecc: "H", mode: "byte" }),
		).toThrow(/does not fit/i);
	});
});

describe("V1-H matrix selection", () => {
	test("generateQrCode returns version 1 for payloads within H capacity", () => {
		const result = generateQrCode("HELLO!", { ecc: "H", mode: "byte" });
		expect(result.version).toBe(1);
		expect(result.ecc).toBe("H");
	});

	test("generateQrCode promotes for larger payloads with ECC H", () => {
		const payload = "C".repeat(MAX_V1_H_PAYLOAD + 3);
		const result = generateQrCode(payload, { ecc: "H", mode: "byte" });
		expect(result.version).toBeGreaterThan(1);
		expect(result.ecc).toBe("H");
	});
});

describe("Comparative ECC H behavior", () => {
	test("ECC H chooses same or larger version than ECC L for the same payload", () => {
		const payload = "The quick brown fox jumps over the lazy dog!";
		const low = generateQrCode(payload, { ecc: "L" });
		const high = generateQrCode(payload, { ecc: "H" });

		expect(high.version).toBeGreaterThanOrEqual(low.version);
		expect(high.matrix.size).toBe(17 + 4 * high.version);
	});

	test("Tighter version constraints can reject ECC H even when ECC L fits", () => {
		const payload = "A".repeat(28);
		const fits = generateQrCode(payload, {
			ecc: "L",
			maxVersion: 2,
			mode: "byte",
		});
		expect(fits.version).toBeLessThanOrEqual(2);

		expect(() =>
			generateQrCode(payload, { ecc: "H", maxVersion: 2, mode: "byte" }),
		).toThrow(/no version|cannot fit/i);
	});
});
