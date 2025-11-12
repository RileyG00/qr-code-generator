export type EccLevel = "L" | "M" | "Q" | "H";

export interface QROptions {
	version?: 1;
	ecc?: EccLevel;
}

export type ByteBuffer = number[] | Uint8Array;

export interface QRCodewords {
	version: 1;
	ecc: "L";
	// Data codewords after mode/length/data/terminator/zero pad/0xEC,0x11 pads
	dataCodewords: ByteBuffer; // length = 19 for V1-L

	// NEW: Reed-Solomon parity bytes for V1-L (single block, 7 bytes)
	eccCodewords: ByteBuffer; // length = 7 for V1-L

	// OPTIONAL: convenience if you ever want to hand back data+ecc together
	allCodewords?: ByteBuffer; // length = 26 for V1-L
}

export interface QRMatrix {
	size: number; // 21 for V1
	modules: boolean[][]; // true = dark
}
