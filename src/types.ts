export type VersionNumber =
	| 1
	| 2
	| 3
	| 4
	| 5
	| 6
	| 7
	| 8
	| 9
	| 10
	| 11
	| 12
	| 13
	| 14
	| 15
	| 16
	| 17
	| 18
	| 19
	| 20
	| 21
	| 22
	| 23
	| 24
	| 25
	| 26
	| 27
	| 28
	| 29
	| 30
	| 31
	| 32
	| 33
	| 34
	| 35
	| 36
	| 37
	| 38
	| 39
	| 40;

export type EccLevel = "L" | "M" | "Q" | "H";

export type QRMode = "byte" | "alphanumeric";

export interface QROptions {
	version?: VersionNumber;
	ecc?: EccLevel;
	mode?: QRMode;
	minVersion?: VersionNumber;
	maxVersion?: VersionNumber;
}

export type ByteBuffer = number[] | Uint8Array;

export interface CodewordBlock {
	data: Uint8Array;
	ecc: Uint8Array;
}

export interface QRCodewords {
	version: VersionNumber;
	ecc: EccLevel;
	mode: QRMode;
	dataCodewords: Uint8Array;
	eccCodewords: Uint8Array;
	interleavedCodewords: Uint8Array;
	blocks: readonly CodewordBlock[];
	/**
	 * Optional alias for legacy consumers that expect data+ecc as a single array.
	 * Mirrors `interleavedCodewords`.
	 */
	allCodewords?: ByteBuffer;
}

export interface QRMatrix {
	size: number; // 21 for V1
	modules: boolean[][]; // true = dark
}
