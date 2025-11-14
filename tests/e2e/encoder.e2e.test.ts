import { describe, expect, test } from "vitest";
import { generateQrCode } from "../../src";
import { prepareCodewords } from "../../src/encoder";
import { getVersionCapacity } from "../../src/metadata/capacity";

const assertFilled = (size: number, rows: (0 | 1 | null)[][]) => {
	for (let r = 0; r < size; r++) {
		for (let c = 0; c < size; c++) {
			expect(rows[r][c]).not.toBeNull();
		}
	}
};

describe("generateQrCode (matrix assembly)", () => {
	test("automatically promotes to Version 2 for inputs beyond V1 capacity", () => {
		const payload = "A".repeat(20);
		const result = generateQrCode(payload, { mode: "byte" });
		expect(result.version).toBe(2);
		expect(result.matrix.size).toBe(25);
	});

	test("escalates to Version 3 or higher for longer payloads", () => {
		const payload = "A".repeat(60);
		const result = generateQrCode(payload);
		expect(result.version).toBeGreaterThanOrEqual(3);
		expect(result.matrix.size).toBe(17 + 4 * result.version);
	});

	test("generateQrCode returns SVG with expected dimensions", () => {
		const base = generateQrCode("test");
		const margin = 2;
		const moduleSize = 10;
		const expectedSize =
			(base.matrix.size + margin * 2) * moduleSize;

		const { svg } = generateQrCode("test", undefined, {
			margin,
			moduleSize,
			title: "Example",
		});

		expect(svg.startsWith("<svg")).toBe(true);
		expect(svg.trim().endsWith("</svg>")).toBe(true);
		expect(svg).toContain(
			`viewBox="0 0 ${expectedSize} ${expectedSize}"`,
		);
		expect(svg).toContain(`<rect width="${expectedSize}" height="${expectedSize}"`);
		expect(svg).toMatch(/<rect x="/);
	});

	test("throws a descriptive error when input exceeds Version 40 capacity", () => {
		const payload = "X".repeat(5000);
		expect(() => generateQrCode(payload)).toThrow(/no version|cannot fit/i);
	});

	test("throws when minVersion is greater than maxVersion", () => {
		expect(() =>
			generateQrCode("data", { minVersion: 5, maxVersion: 4 }),
		).toThrow(/minVersion/i);
	});

	test("throws when constraints forbid a fitting version", () => {
		const payload = "B".repeat(40);
		expect(() => generateQrCode(payload, { maxVersion: 1 })).toThrow(
			/no version|cannot fit/i,
		);
	});
});

test("large payload stays within metadata capacity and fills the matrix", () => {
	const payload = "LargePayload-".repeat(40);
	const prepared = prepareCodewords(payload);
	const info = getVersionCapacity(prepared.version);
	expect(prepared.interleavedCodewords.length).toBe(info.totalCodewords);

	const result = generateQrCode(payload);
	expect(result.version).toBe(prepared.version);
	expect(result.ecc).toBe(prepared.ecc);
	expect(result.matrix.size).toBe(17 + 4 * result.version);
	assertFilled(result.matrix.size, result.matrix.values);
});

test("auto-detects alphanumeric mode to reduce the required version", () => {
	const payload = "A".repeat(1092);
	const autoPlan = prepareCodewords(payload);
	const forcedByte = prepareCodewords(payload, { mode: "byte" });

	expect(autoPlan.mode).toBe("alphanumeric");
	expect(autoPlan.version).toBeLessThan(forcedByte.version);

	const autoMatrix = generateQrCode(payload);
	const forcedMatrix = generateQrCode(payload, { mode: "byte" });
	expect(autoMatrix.version).toBe(autoPlan.version);
	expect(forcedMatrix.version).toBe(forcedByte.version);
	expect(autoMatrix.version).toBeLessThan(forcedMatrix.version);
});

test("forcing alphanumeric mode with unsupported characters throws", () => {
	expect(() =>
		prepareCodewords("mixedCase123", { mode: "alphanumeric" }),
	).toThrow(/alphanumeric set/i);
});
