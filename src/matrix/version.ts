import { Matrix, reserveOnly, setModule } from "./types";

const VERSION_INFO_GENERATOR = 0b1111100100101; // 0x1F25

const toBitsMSB = (value: number, width: number): (0 | 1)[] =>
	Array.from({ length: width }, (_, idx) =>
		((value >> (width - 1 - idx)) & 1) === 1 ? 1 : 0,
	);

const shouldApplyVersionInfo = (version: number): boolean => version >= 7;

export const makeVersionInfoBits = (version: number): number => {
	if (version < 7 || version > 40) {
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

export const reserveVersionInfo = (m: Matrix, version: number): void => {
	if (!shouldApplyVersionInfo(version)) return;
	const start = m.size - 11;

	for (let r = 0; r < 6; r++) {
		for (let c = 0; c < 3; c++) {
			reserveOnly(m, r, start + c);
		}
	}

	for (let r = 0; r < 3; r++) {
		for (let c = 0; c < 6; c++) {
			reserveOnly(m, start + r, c);
		}
	}
};

export const writeVersionInfo = (m: Matrix, version: number): void => {
	if (!shouldApplyVersionInfo(version)) return;
	const bits = toBitsMSB(makeVersionInfoBits(version), 18);
	const start = m.size - 11;
	let idx = 0;

	for (let row = 0; row < 6; row++) {
		for (let col = 0; col < 3; col++, idx++) {
			const bit = bits[idx];
			setModule(m, row, start + col, bit, true);
			setModule(m, start + col, row, bit, true);
		}
	}
};
