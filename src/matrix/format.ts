import { Matrix, reserveOnly } from "./types";

export const TOP_LEFT_FORMAT_POSITIONS: Array<[number, number]> = [
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

export const makeSecondaryFormatPositions = (
	size: number,
): Array<[number, number]> => {
	const positions: Array<[number, number]> = [];
	for (let r = size - 1; r >= size - 7; r--) positions.push([r, 8]);
	for (let c = size - 8; c < size; c++) positions.push([8, c]);
	return positions;
};

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
