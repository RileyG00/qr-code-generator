import { describe, test, expect } from "vitest";
import { makeGF256 } from "../src/math/gf256";
import { makeGeneratorPoly } from "../src/rs/generator";
import { rsEncode } from "../src/rs/encode";
import { prepareV1L } from "../src";

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
		const data = prepareV1L("HELLO").dataCodewords;
		const gf = makeGF256();
		const ecc = rsEncode(gf, Uint8Array.from(data), 7);
		expect(ecc.length).toBe(7);
	});

	test("appending parity yields codeword polynomial divisible by generator", () => {
		const gf = makeGF256();
		const data = prepareV1L("HELLO").dataCodewords; // 19 bytes
		const ecc = rsEncode(gf, Uint8Array.from(data), 7); // 7 bytes
		const all = Uint8Array.from([...data, ...ecc]);

		// Not strictly necessary to re-derive g, but confirms α^i roots property
		for (let i = 0; i < 7; i++) {
			const alphaPow = gf.exp(i);
			expect(evalPoly(gf, all, alphaPow)).toBe(0);
		}
	});
});
