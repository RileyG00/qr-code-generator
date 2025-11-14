import { describe, test, expect } from "vitest";
import { makeGF256 } from "../src/math/gf256";
import { makeGeneratorPoly } from "../src/rs/generator";
import { rsEncode } from "../src/rs/encode";
import { prepareCodewords } from "../src";

const evalPoly = (
	gf: ReturnType<typeof makeGF256>,
	coeffs: Uint8Array,
	x: number,
): number => {
	// coeffs are highest-degree first
	let acc: number = 0;
	for (let i = 0; i < coeffs.length; i++) {
		const pow = coeffs.length - 1 - i;
		const term = gf.mul(coeffs[i], pow === 0 ? 1 : gf.pow(x, pow));
		acc ^= term;
	}
	return acc;
};

describe("RS encoder V1-L", () => {
	test("parity length is 7 for V1-L", () => {
		const data = prepareCodewords("HELLO", {
			version: 1,
			ecc: "L",
			mode: "byte",
		}).dataCodewords;
		const gf = makeGF256();
		const ecc = rsEncode(gf, Uint8Array.from(data), 7);
		expect(ecc.length).toBe(7);
	});

	test("generator polynomial for 7 parity bytes is monic and has alpha^i roots", () => {
		const gf = makeGF256();
		const gen = makeGeneratorPoly(gf, 7);
		expect(gen.length).toBe(8);
		expect(gen[0]).toBe(1);
		for (let i = 0; i < 7; i++) {
			const alphaPow = gf.exp(i);
			expect(evalPoly(gf, gen, alphaPow)).toBe(0);
		}
	});

	test("rsEncode returns empty parity when t = 0", () => {
		const gf = makeGF256();
		const data = Uint8Array.from([1, 2, 3, 4]);
		const ecc = rsEncode(gf, data, 0);
		expect(ecc).toHaveLength(0);
	});

	test("rsEncode leaves the provided data array untouched", () => {
		const gf = makeGF256();
		const data = Uint8Array.from([5, 123, 255, 42]);
		const before = Uint8Array.from(data);
		rsEncode(gf, data, 5);
		expect(Array.from(data)).toEqual(Array.from(before));
	});

	test("all-zero payload yields all-zero parity bytes", () => {
		const gf = makeGF256();
		const zeroData = new Uint8Array(19);
		const ecc = rsEncode(gf, zeroData, 7);
		expect(Array.from(ecc)).toEqual(new Array(7).fill(0));
	});

	test("appending parity yields codeword polynomial divisible by generator", () => {
		const gf = makeGF256();
		const data = prepareCodewords("HELLO", {
			version: 1,
			ecc: "L",
			mode: "byte",
		}).dataCodewords; // 19 bytes
		const ecc = rsEncode(gf, Uint8Array.from(data), 7); // 7 bytes
		const all = Uint8Array.from([...data, ...ecc]);

		// Not strictly necessary to re-derive g, but confirms alpha^i roots property
		for (let i = 0; i < 7; i++) {
			const alphaPow = gf.exp(i);
			expect(evalPoly(gf, all, alphaPow)).toBe(0);
		}
	});

	test("HELLO parity bytes match the known spec values", () => {
		const gf = makeGF256();
		const data = prepareCodewords("HELLO", {
			version: 1,
			ecc: "L",
			mode: "byte",
		}).dataCodewords;
		const ecc = rsEncode(gf, Uint8Array.from(data), 7);
		expect(Array.from(ecc)).toEqual([77, 42, 211, 187, 159, 32, 132]);
	});
});
