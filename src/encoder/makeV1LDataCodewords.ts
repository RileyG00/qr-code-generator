// src/encoder/makeV1LDataCodewords.ts
import { QROptions } from "../types";
import {
	MODE_INDICATOR_BYTE,
	V1L_DATA_CODEWORDS,
	TOTAL_BITS_V1L,
} from "../constants/v1l";
import { encodeByteModePayload } from "./byte-mode";

const toBits = (value: number, bitCount: number): number[] =>
	Array.from(
		{ length: bitCount },
		(_, i) => (value >> (bitCount - 1 - i)) & 1,
	);

const bitsToBytes = (bits: number[]): number[] => {
	const out: number[] = [];
	for (let i = 0; i < bits.length; i += 8) {
		let b = 0;
		for (let j = 0; j < 8; j++) b = (b << 1) | (bits[i + j] ?? 0);
		out.push(b);
	}
	return out;
};

export const makeV1LDataCodewords = (
	input: string,
	_opts?: QROptions,
): number[] => {
	const bits: number[] = [];

	// 1) mode (0100)
	bits.push(...toBits(MODE_INDICATOR_BYTE, 4));

	// 2) count (8 bits for v1–v9 in byte mode)
	bits.push(...toBits(input.length, 8));

	// 3) data bytes
	const msg: Uint8Array = encodeByteModePayload(input);
	for (let i = 0; i < msg.length; i++) bits.push(...toBits(msg[i], 8));

	// 4) terminator (up to 4 bits, bounded by capacity)
	const remaining = TOTAL_BITS_V1L - bits.length;
	const term = Math.min(4, Math.max(0, remaining));
	for (let i = 0; i < term; i++) bits.push(0);

	// 5) pad to byte boundary
	while (bits.length % 8 !== 0) bits.push(0);

	// 6) to bytes
	const codewords: number[] = bitsToBytes(bits);

	// 7) pad to 19 bytes
	const PAD_BYTES = [0xec, 0x11];
	let idx = 0;
	while (codewords.length < V1L_DATA_CODEWORDS) {
		codewords.push(PAD_BYTES[idx]);
		idx ^= 1;
	}

	return codewords;
};
