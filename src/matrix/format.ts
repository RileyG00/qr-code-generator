import type { MaskId } from "../mask/types";
import type { EccLevel } from "../types";
import { Matrix, reserveOnly, setModule } from "./types";

const FORMAT_GENERATOR = 0b10100110111;
const FORMAT_MASK = 0b101010000010010;

const ECC_BITS: Record<EccLevel, number> = {
	L: 0b01,
	M: 0b00,
	Q: 0b11,
	H: 0b10,
};

const TOP_LEFT_POSITIONS: Array<[number, number]> = [
	[8, 0],
	[8, 1],
	[8, 2],
	[8, 3],
	[8, 4],
	[8, 5],
	[8, 7],
	[8, 8],
	[7, 8],
	[5, 8],
	[4, 8],
	[3, 8],
	[2, 8],
	[1, 8],
	[0, 8],
];

const makeOtherPositions = (size: number): Array<[number, number]> => {
	const positions: Array<[number, number]> = [];
	for (let r = size - 1; r >= size - 7; r--) positions.push([r, 8]);
	for (let c = size - 8; c < size; c++) positions.push([8, c]);
	return positions;
};

const toBitsMSB = (value: number, width: number): (0 | 1)[] =>
	Array.from({ length: width }, (_, idx) =>
		((value >> (width - 1 - idx)) & 1) === 1 ? 1 : 0,
	);

export const reserveFormatInfo = (m: Matrix): void => {
	const n: number = m.size;

	// Top-left "cross"
	for (let c = 0; c <= 8; c++) {
		if (c === 6) continue; // timing column
		reserveOnly(m, 8, c);
	}
	for (let r = 0; r <= 8; r++) {
		if (r === 6) continue; // timing row
		reserveOnly(m, r, 8);
	}

	// Top-right row band: row 8, columns n-8..n-1
	for (let c = n - 8; c < n; c++) {
		reserveOnly(m, 8, c);
	}

	// Bottom-left column band: column 8, rows n-7..n-1
	for (let r = n - 7; r < n; r++) {
		reserveOnly(m, r, 8);
	}
};

export const makeFormatInfoBits = (
	ecc: EccLevel,
	maskId: MaskId,
): number => {
	const eccBits = ECC_BITS[ecc];
	const data = ((eccBits << 3) | maskId) & 0x1f;
	let value = data << 10;

	for (let bit = 14; bit >= 10; bit--) {
		if (((value >> bit) & 1) === 1) {
			value ^= FORMAT_GENERATOR << (bit - 10);
		}
	}

	const remainder = value & 0x3ff;
	const combined = ((data << 10) | remainder) ^ FORMAT_MASK;
	return combined & 0x7fff;
};

export const writeFormatInfo = (m: Matrix, formatBits: number): void => {
	const bits = toBitsMSB(formatBits & 0x7fff, 15);

	const apply = (positions: Array<[number, number]>) => {
		for (let i = 0; i < positions.length; i++) {
			const [r, c] = positions[i];
			const bit = bits[i];
			setModule(m, r, c, bit, true);
		}
	};

	apply(TOP_LEFT_POSITIONS);
	apply(makeOtherPositions(m.size));
};
