import { QROptions, QRCodewords } from "./types";

// --- Constants for Version 1-L ---
const V1_SIZE = 21; // 21x21 modules
const V1L_DATA_CODEWORDS = 19; // bytes
// For byte mode with V1-V9, character count is 8 bits
const MODE_INDICATOR_BYTE = 0b0100; // 4 bits

// QR padding bytes repeat 0xEC, 0x11
const PAD_BYTES = [0xec, 0x11];

class BitBuffer {
	private bits: number[] = [];
	get length(): number {
		return this.bits.length;
	}

	pushBits(value: number, bitCount: number): void {
		// value is assumed non-negative and fits bitCount
		for (let i = bitCount - 1; i >= 0; i--) {
			this.bits.push((value >>> i) & 1);
		}
	}

	toBytes(): Uint8Array {
		const outLen = Math.ceil(this.bits.length / 8);
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
	}
}

/**
 * Encodes input text in Byte mode (ISO-8859-1 / 8-bit bytes as-is).
 * M0: No ECI, no UTF-8 segmentation. If you pass non-ASCII, ensure you pre-encode to bytes you expect.
 */
function encodeByteModePayload(input: string): Uint8Array {
	// Minimal: treat JS string charCodeAt as byte (0-255). For non-latin, caller should pre-encode.
	const bytes = new Uint8Array(input.length);
	for (let i = 0; i < input.length; i++) {
		bytes[i] = input.charCodeAt(i) & 0xff;
	}
	return bytes;
}

/**
 * Build the raw data bitstream for Version 1-L:
 * [mode(4)] [len(8)] [data(8*len)] [terminator up to 4 bits] [0 pad to byte] [pad bytes 0xEC/0x11 to 19 bytes]
 */
function makeV1LDataCodewords(input: string): Uint8Array {
	const dataBytes = encodeByteModePayload(input);

	// Capacity for V1-L in BYTE mode is 152 data bits (19 data codewords * 8) BEFORE EC.
	const totalDataBits = V1L_DATA_CODEWORDS * 8; // 152
	const bb = new BitBuffer();

	// Mode indicator (byte)
	bb.pushBits(MODE_INDICATOR_BYTE, 4);

	// Character count (8 bits for versions 1-9)
	if (dataBytes.length > 255) {
		throw new Error("V1-L byte mode: length must fit in 8 bits (<= 255).");
	}
	bb.pushBits(dataBytes.length, 8);

	// Data bytes
	for (let i = 0; i < dataBytes.length; i++) {
		bb.pushBits(dataBytes[i], 8);
	}

	// Terminator: up to 4 zero bits if room remains
	const remainingBits = totalDataBits - bb.length;
	if (remainingBits < 0) {
		throw new Error("Data too long for Version 1-L.");
	}
	const terminatorBits = Math.min(4, remainingBits);
	if (terminatorBits > 0) bb.pushBits(0, terminatorBits);

	// Pad to next byte boundary with zero bits
	const mod8 = bb.length % 8;
	if (mod8 !== 0) {
		bb.pushBits(0, 8 - mod8);
	}

	// Convert to bytes, then add alternating pad bytes until 19 total
	let bytes = Array.from(bb.toBytes());
	while (bytes.length < V1L_DATA_CODEWORDS) {
		const pad = PAD_BYTES[(bytes.length - bb.length / 8) % 2 === 0 ? 0 : 1];
		bytes.push(pad);
	}

	// If overshot (shouldn’t), trim; else ensure length == 19
	bytes = bytes.slice(0, V1L_DATA_CODEWORDS);

	return new Uint8Array(bytes);
}

/**
 * Public M0: returns data codewords only (19 bytes for V1-L).
 * Next milestone will add RS parity, then matrix.
 */
export function prepareV1L(input: string, _opts?: QROptions): QRCodewords {
	const dataCodewords = makeV1LDataCodewords(input);
	return {
		version: 1,
		ecc: "L",
		dataCodewords,
		// M1+: ecCodewords
	};
}

// Placeholder for future steps:
// - generateECCodewords(dataCodewords) -> ecCodewords (length 7)
// - buildBaseMatrix() -> finder/separator/timing/alignment
// - placeData(matrix, codewords)
// - chooseMask(matrix) or fixedMask
// - applyFormatAndVersionInfo(matrix)
export function getPlannedMatrixSize(): number {
	return V1_SIZE;
}
