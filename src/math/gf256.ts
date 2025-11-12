// GF(256) with primitive polynomial x^8 + x^4 + x^3 + x^2 + 1 (0x11d)
export type GF256 = {
	add: (a: number, b: number) => number;
	sub: (a: number, b: number) => number;
	mul: (a: number, b: number) => number;
	div: (a: number, b: number) => number;
	pow: (a: number, n: number) => number;
	exp: (i: number) => number;
	log: (x: number) => number;
};

export const makeGF256 = (primitive: number = 0x11d): GF256 => {
	const expTable: number[] = new Array(512);
	const logTable: number[] = new Array(256).fill(0);

	let x: number = 1;
	for (let i = 0; i < 255; i++) {
		expTable[i] = x;
		logTable[x] = i;
		x <<= 1;
		if (x & 0x100) x ^= primitive;
	}
	// duplicate to avoid mod 255 in hot paths
	for (let i = 255; i < 512; i++) expTable[i] = expTable[i - 255];

	const add = (a: number, b: number): number => a ^ b;
	const sub = add; // same in GF(2^8)

	const mul = (a: number, b: number): number => {
		if (a === 0 || b === 0) return 0;
		return expTable[logTable[a] + logTable[b]];
	};

	const div = (a: number, b: number): number => {
		if (b === 0) throw new Error("GF256 div by zero");
		if (a === 0) return 0;
		let idx: number = logTable[a] - logTable[b];
		if (idx < 0) idx += 255;
		return expTable[idx];
	};

	const pow = (a: number, n: number): number => {
		if (n === 0) return 1;
		if (a === 0) return 0;
		const k = (((logTable[a] * n) % 255) + 255) % 255;
		return expTable[k];
	};

	const exp = (i: number): number => expTable[((i % 255) + 255) % 255]; // handles negative i defensively

	const log = (v: number): number => {
		if (v === 0) throw new Error("GF256 log(0)");
		return logTable[v];
	};

	return { add, sub, mul, div, pow, exp, log };
};
