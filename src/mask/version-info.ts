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
	const bits = makeVersionInfoBits(version);
	const size = matrix.size;
	const start = size - 11;

	for (let i = 0; i < 18; i++) {
		const bit = ((bits >> i) & 1) === 1 ? 1 : 0;
		const row = Math.floor(i / 3);
		const col = start + (i % 3);

		setModule(matrix, row, col, bit as 0 | 1, true);
		setModule(matrix, col, row, bit as 0 | 1, true);
	}
};
