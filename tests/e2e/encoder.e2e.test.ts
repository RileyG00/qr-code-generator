import { describe, expect, test } from "vitest";
import { encodeToMatrix, encodeToSvg } from "../../src";

const assertFilled = (size: number, rows: (0 | 1 | null)[][]) => {
	for (let r = 0; r < size; r++) {
		for (let c = 0; c < size; c++) {
			expect(rows[r][c]).not.toBeNull();
		}
	}
};

describe("encodeToMatrix", () => {
	test("produces version 1-L for short payloads", () => {
		const result = encodeToMatrix("HELLO");
		expect(result.version).toBe(1);
		expect(result.ecc).toBe("L");
		expect(result.matrix.size).toBe(21);
		expect(result.maskId).toBeGreaterThanOrEqual(0);
		expect(result.maskId).toBeLessThanOrEqual(7);
		assertFilled(result.matrix.size, result.matrix.values);
	});

	test("automatically promotes to Version 2 for inputs beyond V1 capacity", () => {
		const payload = "A".repeat(20);
		const result = encodeToMatrix(payload);
		expect(result.version).toBe(2);
		expect(result.matrix.size).toBe(25);
	});

	test("escalates to Version 3 or higher for longer payloads", () => {
		const payload = "A".repeat(60);
		const result = encodeToMatrix(payload);
		expect(result.version).toBeGreaterThanOrEqual(3);
		expect(result.matrix.size).toBe(17 + 4 * result.version);
	});

	test("higher ECC levels choose same or larger versions", () => {
		const payload = "The quick brown fox jumps over the lazy dog!";
		const low = encodeToMatrix(payload, { ecc: "L" });
		const high = encodeToMatrix(payload, { ecc: "H" });
		expect(high.version).toBeGreaterThanOrEqual(low.version);
		expect(high.matrix.size).toBe(17 + 4 * high.version);
	});

	test("tighter version constraints can reject stronger ECC levels", () => {
		const payload = "A".repeat(28);
		const fits = encodeToMatrix(payload, { ecc: "L", maxVersion: 2 });
		expect(fits.version).toBeLessThanOrEqual(2);
		expect(() =>
			encodeToMatrix(payload, { ecc: "H", maxVersion: 2 }),
		).toThrow(/no version/i);
	});

	test("encodeToSvg wraps encodeToMatrix and renders expected dimensions", () => {
		const base = encodeToMatrix("test");
		const margin = 2;
		const moduleSize = 10;
		const expectedSize =
			(base.matrix.size + margin * 2) * moduleSize;

		const svg = encodeToSvg("test", undefined, {
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
		expect(() => encodeToMatrix(payload)).toThrow(/no version/i);
	});

	test("throws when minVersion is greater than maxVersion", () => {
		expect(() =>
			encodeToMatrix("data", { minVersion: 5, maxVersion: 4 }),
		).toThrow(/minVersion/i);
	});

	test("throws when constraints forbid a fitting version", () => {
		const payload = "B".repeat(40);
		expect(() => encodeToMatrix(payload, { maxVersion: 1 })).toThrow(
			/no version/i,
		);
	});
});
