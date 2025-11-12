import { Matrix, setModule } from "./types";

export const bytesToBitsMSB = (bytes: Uint8Array): number[] => {
	const bits: number[] = [];
	for (let i = 0; i < bytes.length; i++) {
		const b: number = bytes[i];
		for (let k = 7; k >= 0; k--) {
			bits.push((b >> k) & 1);
		}
	}
	return bits;
};

export const placeDataBitsV1 = (m: Matrix, dataAndEcc: Uint8Array): void => {
	const bits: number[] = bytesToBitsMSB(dataAndEcc);
	let bitIndex: number = 0;

	const n: number = m.size;
	let col: number = n - 1;
	let upward: boolean = true;

	while (col > 0) {
		if (col === 6) col--; // skip timing column

		for (let i = 0; i < n; i++) {
			const row: number = upward ? n - 1 - i : i;

			// Right then left column of the pair
			for (let dx = 0; dx < 2; dx++) {
				const cc: number = col - dx;
				if (m.reserved[row][cc]) continue;
				if (m.values[row][cc] !== null) continue;

				const bit: number =
					bitIndex < bits.length ? bits[bitIndex++] : 0; // any leftover = 0 (shouldn’t happen if upstream is correct)
				setModule(m, row, cc, bit ? 1 : 0, false);
			}
		}

		col -= 2;
		upward = !upward;
	}

	// At this point, all data+ecc bits should be placed exactly.
};
