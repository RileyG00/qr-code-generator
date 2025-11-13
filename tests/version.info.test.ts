import { describe, expect, test } from "vitest";
import { reserveVersionInfo } from "../src/matrix/version";
import {
	makeVersionInfoBits,
	writeVersionInfoBits as writeVersionInfo,
} from "../src/mask/version-info";
import { makeMatrix } from "../src/matrix/types";

const bitsToString = (bits: number, width: number): string =>
	bits.toString(2).padStart(width, "0");

const collectTopRight = (size: number): Array<[number, number]> => {
	const start = size - 11;
	const coords: Array<[number, number]> = [];
	for (let r = 0; r < 6; r++) {
		for (let c = 0; c < 3; c++) {
			coords.push([r, start + c]);
		}
	}
	return coords;
};

const collectBottomLeft = (size: number): Array<[number, number]> => {
	const start = size - 11;
	const coords: Array<[number, number]> = [];
	for (let r = 0; r < 3; r++) {
		for (let c = 0; c < 6; c++) {
			coords.push([start + r, c]);
		}
	}
	return coords;
};

describe("version info encoding", () => {
	test("known version 7 bits match spec table", () => {
		const bits = makeVersionInfoBits(7);
		expect(bitsToString(bits, 18)).toBe("000111110010010100");
	});

	test("all version info words embed the version and satisfy BCH", () => {
		const generator = 0b1111100100101;
		const seen = new Set<number>();
		for (let version = 7; version <= 40; version++) {
			const bits = makeVersionInfoBits(version);
			expect(bits >> 12).toBe(version);

			let remainder = bits;
			for (let bit = 17; bit >= 12; bit--) {
				if (((remainder >> bit) & 1) === 1) {
					remainder ^= generator << (bit - 12);
				}
			}
			expect(remainder & 0xfff).toBe(0);
			seen.add(bits);
		}
		expect(seen.size).toBe(34);
	});

	test("reserveVersionInfo marks both 3x6 areas for version >= 7", () => {
		const m = makeMatrix(45);
		reserveVersionInfo(m, 7);

		for (const [r, c] of [
			...collectTopRight(m.size),
			...collectBottomLeft(m.size),
		]) {
			expect(m.reserved[r][c]).toBe(true);
			expect(m.values[r][c]).toBeNull();
		}
	});

	test("writeVersionInfo stamps identical bit patterns in both areas", () => {
		const m = makeMatrix(45);
		reserveVersionInfo(m, 7);
		const bits = makeVersionInfoBits(7);
		writeVersionInfo(m, 7);

		const expected = bitsToString(bits, 18);
	const topRight = collectTopRight(m.size)
		.map(([r, c]) => m.values[r][c])
		.join("");
	const bottomLeft = collectBottomLeft(m.size)
		.map(([r, c]) => m.values[r][c])
		.join("");

		expect(topRight).toBe(expected);
		expect(bottomLeft).toBe(expected);
	});

	test("version info helpers no-op for version < 7", () => {
		const m = makeMatrix(45);
		reserveVersionInfo(m, 1);
		writeVersionInfo(m, 1);
		for (let r = 0; r < m.size; r++) {
			for (let c = 0; c < m.size; c++) {
				expect(m.reserved[r][c]).toBe(false);
				expect(m.values[r][c]).toBeNull();
			}
		}
	});
});
