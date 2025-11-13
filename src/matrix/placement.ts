import { Matrix, setModule } from "./types";

export const bytesToBitsMSB = (bytes: Uint8Array): number[] => {
	const bits: number[] = [];
	for (let i = 0; i < bytes.length; i++) {
		const byte = bytes[i];
		for (let bit = 7; bit >= 0; bit--) {
			bits.push((byte >> bit) & 1);
		}
	}
	return bits;
};

export const placeDataBits = (matrix: Matrix, dataAndEcc: Uint8Array): void => {
	const bits = bytesToBitsMSB(dataAndEcc);
	let bitIndex = 0;
	const size = matrix.size;

	let column = size - 1;
	let upward = true;

	while (column > 0) {
		if (column === 6) column--; // Skip vertical timing column

		for (let i = 0; i < size; i++) {
			const row = upward ? size - 1 - i : i;

			for (let dx = 0; dx < 2; dx++) {
				const col = column - dx;
				if (col < 0) continue;
				if (matrix.reserved[row][col]) continue;
				if (matrix.values[row][col] !== null) continue;

				const bit =
					bitIndex < bits.length ? bits[bitIndex++] : 0;
				setModule(matrix, row, col, bit ? 1 : 0, false);
			}
		}

		column -= 2;
		upward = !upward;
	}
};
