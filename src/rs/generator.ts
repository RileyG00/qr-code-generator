import type { GF256 } from "../math/gf256";

const polyMul = (gf: GF256, a: number[], b: number[]): number[] => {
	const res = new Array(a.length + b.length - 1).fill(0);
	for (let i = 0; i < a.length; i++) {
		for (let j = 0; j < b.length; j++) {
			res[i + j] = gf.add(res[i + j], gf.mul(a[i], b[j]));
		}
	}
	return res;
};

export const makeGeneratorPoly = (gf: GF256, t: number): Uint8Array => {
	let g: number[] = [1]; // degree 0, monic
	for (let i = 0; i < t; i++) {
		const root = gf.exp(i); // α^0, α^1, ..., α^(t-1)
		g = polyMul(gf, g, [1, root]); // (x + α^i)
	}
	return Uint8Array.from(g); // length t+1
};
