import { Matrix, reserveOnly } from "./types";

export const shouldApplyVersionInfo = (version: number): boolean =>
	version >= 7;

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
