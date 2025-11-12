export type EccLevel = "L" | "M" | "Q" | "H";

export interface QROptions {
	version?: 1;
	ecc?: EccLevel;
}

export interface QRCodewords {
	version: 1;
	ecc: "L";
	// Data codewords after mode/length/data/terminator/zero pad/0xEC,0x11 pads
	dataCodewords: Uint8Array; // length = 19 for V1-L
	// M1+: add ecCodewords: Uint8Array; // length = 7 for V1-L
}

export interface QRMatrix {
	size: number; // 21 for V1
	modules: boolean[][]; // true = dark
}
