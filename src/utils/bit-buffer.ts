export class BitBuffer {
	private bits: number[] = [];
	get length(): number {
		return this.bits.length;
	}

	pushBits = (value: number, bitCount: number): void => {
		for (let i = bitCount - 1; i >= 0; i--) {
			this.bits.push((value >>> i) & 1);
		}
	};

	toBytes = (): Uint8Array => {
		const outLen: number = Math.ceil(this.bits.length / 8);
		const out = new Uint8Array(outLen);
		for (let i = 0; i < outLen; i++) {
			let b = 0;
			for (let j = 0; j < 8; j++) {
				const bit = this.bits[i * 8 + j] ?? 0;
				b = (b << 1) | bit;
			}
			out[i] = b;
		}
		return out;
	};
}
