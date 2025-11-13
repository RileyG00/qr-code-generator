import { Matrix, setModule } from "../matrix/types";
import { shouldApplyVersionInfo } from "../matrix/version";

const VERSION_INFO_GENERATOR = 0b1111100100101;

const toBitsMSB = (value: number, width: number): (0 | 1)[] =>
	Array.from({ length: width }, (_, idx) =>
		((value >> (width - 1 - idx)) & 1) === 1 ? 1 : 0,
	);

export const makeVersionInfoBits = (version: number): number => {
	if (!shouldApplyVersionInfo(version)) {
		throw new RangeError("Version info exists only for versions 7..40");
	}

	let value = version << 12;
	for (let bit = 17; bit >= 12; bit--) {
		if (((value >> bit) & 1) === 1) {
			value ^= VERSION_INFO_GENERATOR << (bit - 12);
		}
	}

	const remainder = value & 0xfff;
	return ((version << 12) | remainder) & 0x3ffff;
};

export const writeVersionInfoBits = (matrix: Matrix, version: number): void => {
	if (!shouldApplyVersionInfo(version)) return;
	const bits = toBitsMSB(makeVersionInfoBits(version), 18);
	const start = matrix.size - 11;
	const topRightCoords: Array<[number, number]> = [];
	const bottomLeftCoords: Array<[number, number]> = [];

	for (let row = 0; row < 6; row++) {
		for (let col = 0; col < 3; col++) {
			topRightCoords.push([row, start + col]);
		}
	}

	for (let row = 0; row < 3; row++) {
		for (let col = 0; col < 6; col++) {
			bottomLeftCoords.push([start + row, col]);
		}
	}

	for (let idx = 0; idx < bits.length; idx++) {
		const bit = bits[idx];
		const [trRow, trCol] = topRightCoords[idx];
		const [blRow, blCol] = bottomLeftCoords[idx];
		setModule(matrix, trRow, trCol, bit, true);
		setModule(matrix, blRow, blCol, bit, true);
	}
};
