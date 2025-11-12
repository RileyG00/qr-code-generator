import type { GF256 } from "../math/gf256";
import { makeGeneratorPoly } from "./generator";

/**
 * RS(255, k) style encoder for QR: given data (highest-degree-first) and parity count t,
 * returns a Uint8Array of length t (highest-degree-first) to append to data.
 */
export const rsEncode = (
	gf: GF256,
	data: Uint8Array,
	t: number,
): Uint8Array => {
	if (t <= 0) return new Uint8Array(0);

	const g = makeGeneratorPoly(gf, t); // length t+1, monic, highest-degree-first

	// Message * x^t => append t zeros (highest-degree-first representation)
	const work = new Uint8Array(data.length + t);
	work.set(data, 0);

	// Synthetic division (highest-degree-first):
	// For each position i, eliminate degree at i using g
	for (let i = 0; i < data.length; i++) {
		const coef = work[i];
		if (coef === 0) continue;

		// Multiply generator by coef and XOR into work starting at i
		// g has length t+1, so this touches positions i..i+t
		for (let j = 0; j < g.length; j++) {
			// work[i + j] ^= coef * g[j]
			work[i + j] = gf.add(work[i + j], gf.mul(coef, g[j]));
		}
	}

	// Remainder is in the last t positions, already highest-degree-first (deg t-1 down to 0)
	const rem = work.slice(work.length - t); // EXACTLY t bytes
	return rem;
};
