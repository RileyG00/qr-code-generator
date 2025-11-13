import type { EccLevel } from "../types";
import type { MaskId } from "./types";
import { Matrix, setModule } from "../matrix/types";
import {
	TOP_LEFT_FORMAT_POSITIONS,
	makeSecondaryFormatPositions,
} from "../matrix/format";

const FORMAT_GENERATOR = 0b10100110111;
const FORMAT_MASK = 0b101010000010010;

const ECC_BITS: Record<EccLevel, number> = {
	L: 0b01,
	M: 0b00,
	Q: 0b11,
	H: 0b10,
};

const toBitsMSB = (value: number, width: number): (0 | 1)[] =>
	Array.from({ length: width }, (_, idx) =>
		((value >> (width - 1 - idx)) & 1) === 1 ? 1 : 0,
	);

export const makeFormatInfoBits = (ecc: EccLevel, maskId: MaskId): number => {
	const eccBits = ECC_BITS[ecc];
	const data = ((eccBits << 3) | maskId) & 0x1f;
	let value = data << 10;

	for (let bit = 14; bit >= 10; bit--) {
		if (((value >> bit) & 1) === 1) {
			value ^= FORMAT_GENERATOR << (bit - 10);
		}
	}

	const remainder = value & 0x3ff;
	return ((data << 10) | remainder) ^ FORMAT_MASK;
};

export const writeFormatInfoBits = (
	matrix: Matrix,
	formatBits: number,
): void => {
	const bits = toBitsMSB(formatBits & 0x7fff, 15);

	const applyPositions = (positions: Array<[number, number]>) => {
		for (let i = 0; i < positions.length; i++) {
			const [row, col] = positions[i];
			setModule(matrix, row, col, bits[i], true);
		}
	};

	applyPositions(TOP_LEFT_FORMAT_POSITIONS);
	applyPositions(makeSecondaryFormatPositions(matrix.size));
};

export const applyFormatInfo = (
	matrix: Matrix,
	ecc: EccLevel,
	maskId: MaskId,
): number => {
	const bits = makeFormatInfoBits(ecc, maskId);
	writeFormatInfoBits(matrix, bits);
	return bits;
};
