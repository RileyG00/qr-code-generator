import { describe, expect, test } from "vitest";
import { prepareCodewords, prepareV1L } from "../src";
import { encodeUtf8 } from "../src/encoder/byte-mode";
import { makeDataCodewords } from "../src/encoder/data-codewords";
import { getVersionCapacity } from "../src/metadata/capacity";

// Small helpers used by several tests
const getModeNibble = (firstByte: number) => (firstByte >>> 4) & 0x0f;

/**
 * Extract the 8-bit character count from the first two data codewords.
 * Bits layout (first 12 bits): [mode:4][count:8]
 * - first byte contains [mode:4][count high 4]
 * - second byte's high nibble contains [count low 4]
 */
function extractCountFromFirstTwoBytes(b0: number, b1: number): number {
	// count: high 4 are b0 low nibble, low 4 are b1 high nibble
	const high4 = b0 & 0x0f;
	const low4 = (b1 >>> 4) & 0x0f;
	return (high4 << 4) | low4;
}

const toByteArray = (x: number[] | Uint8Array): number[] =>
	x instanceof Uint8Array ? Array.from(x) : x;

const isByteBuffer = (x: unknown): x is number[] | Uint8Array =>
	x instanceof Uint8Array ||
	(Array.isArray(x) &&
		x.every((v) => Number.isInteger(v) && v >= 0 && v <= 255));

const encodeV1LData = (text: string): number[] => {
	const versionInfo = getVersionCapacity(1);
	return Array.from(
		makeDataCodewords(encodeUtf8(text), versionInfo, "L"),
	);
};

describe("V1-L byte-mode data codewords", () => {
	test("V1-L: HELLO → 19 data codewords (exact bytes, incl. pad pattern)", () => {
		// Precomputed per QR spec:
		// Bits: 0100 (mode) + 00000101 (count=5) + "HELLO" (0x48 0x45 0x4C 0x4C 0x4F)
		// + terminator '0000' to byte align → first 7 bytes listed below
		// Then alternate pad bytes 0xEC, 0x11 until 19 total data codewords.
		const expectedHELLO = [
			0x40,
			0x54,
			0x84,
			0x54,
			0xc4,
			0xc4,
			0xf0, // header + data + terminator aligned
			0xec,
			0x11,
			0xec,
			0x11,
			0xec,
			0x11,
			0xec,
			0x11,
			0xec,
			0x11,
			0xec,
			0x11, // pads to 19
		];

		const actual = encodeV1LData("HELLO");
		expect(actual).toHaveLength(19);
		expect(actual).toEqual(expectedHELLO);
	});

	test("V1-L: mode+count are correct for short ASCII (HELLO)", () => {
		const cw = encodeV1LData("HELLO");
		// Mode nibble should be 0100
		expect(getModeNibble(cw[0])).toBe(0x4);
		// Count should be 5
		expect(extractCountFromFirstTwoBytes(cw[0], cw[1])).toBe(5);
	});

	test("V1-L: pad bytes alternate 0xEC, 0x11 for messages that need padding", () => {
		const cw = encodeV1LData("HELLO"); // needs padding
		// First 7 bytes are header+data+terminator-alignment; pads start at index 7
		for (let i = 7; i < cw.length; i++) {
			const expected = (i - 7) % 2 === 0 ? 0xec : 0x11;
			expect(cw[i]).toBe(expected);
		}
	});

	test("V1-L: capacity boundary — 17 bytes should fit exactly (no pads expected)", () => {
		const seventeenA = "A".repeat(17); // Byte-mode capacity for V1-L
		const cw = encodeV1LData(seventeenA);
		expect(cw).toHaveLength(19);

		// Mode nibble = 0100, count = 17
		expect(getModeNibble(cw[0])).toBe(0x4);
		expect(extractCountFromFirstTwoBytes(cw[0], cw[1])).toBe(17);

		// With exactly 17 bytes payload, there's no room for pad bytes.
		// We can't forbid values equal to 0xEC/0x11 inside real data,
		// so instead assert the *absence of the strict alternating pad tail*.
		// If pads were present, the last 12 bytes would alternate starting with 0xEC;
		// having 17 payload bytes breaks that alternation pattern.
		const padTailLooksAlternating = cw
			.slice(7)
			.every((b, i) => b === (i % 2 === 0 ? 0xec : 0x11));
		expect(padTailLooksAlternating).toBe(false);
	});

	test("V1-L: over-capacity (>= 18 bytes) should throw", () => {
		const eighteenA = "A".repeat(18);
		expect(() => encodeV1LData(eighteenA)).toThrow();
	});
});

describe("prepareV1L end-to-end assembly", () => {
	test("prepareV1L(HELLO) returns correct sizes for data & ECC", () => {
		const p = prepareV1L("HELLO");
		// Structural checks
		expect(isByteBuffer(p.dataCodewords)).toBe(true);
		expect(isByteBuffer(p.eccCodewords)).toBe(true);

		// Normalize so length/value checks always work
		const data = toByteArray(p.dataCodewords);
		const ecc = toByteArray(p.eccCodewords);

		expect(data).toHaveLength(19); // V1-L data capacity
		expect(ecc).toHaveLength(7); // V1-L parity length

		for (const b of ecc) {
			expect(Number.isInteger(b)).toBe(true);
			expect(b >= 0 && b <= 255).toBe(true);
		}
	});

	test("prepareV1L(HELLO) dataCodewords match the encoder output exactly", () => {
		const fromPrepare = prepareV1L("HELLO").dataCodewords;
		const fromEncoder = encodeV1LData("HELLO");
		expect(Array.from(fromPrepare)).toEqual(fromEncoder);
	});

	test("prepareCodewords auto-selects larger version for long payloads", () => {
		const payload = "X".repeat(200);
		const result = prepareCodewords(payload);
		expect(result.version).toBeGreaterThan(1);
		expect(result.dataCodewords.length).toBe(
			getVersionCapacity(result.version).levels[result.ecc].dataCodewords,
		);
		expect(result.eccCodewords.length).toBeGreaterThan(0);
		expect(result.interleavedCodewords.length).toBe(
			result.dataCodewords.length + result.eccCodewords.length,
		);
	});
});
