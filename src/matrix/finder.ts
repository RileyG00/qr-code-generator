import { Matrix, setModule, reserveOnly, Module } from "./types";

const FINDER: Module[][] = [
	[1, 1, 1, 1, 1, 1, 1],
	[1, 0, 0, 0, 0, 0, 1],
	[1, 0, 1, 1, 1, 0, 1],
	[1, 0, 1, 1, 1, 0, 1],
	[1, 0, 1, 1, 1, 0, 1],
	[1, 0, 0, 0, 0, 0, 1],
	[1, 1, 1, 1, 1, 1, 1],
];

const placeFinderAt = (m: Matrix, top: number, left: number): void => {
	for (let r = 0; r < 7; r++) {
		for (let c = 0; c < 7; c++) {
			setModule(m, top + r, left + c, FINDER[r][c] as 0 | 1, true);
		}
	}
	// separator ring (one module white around the 7×7, if within bounds)
	for (let r = -1; r <= 7; r++) {
		for (let c = -1; c <= 7; c++) {
			const rr = top + r,
				cc = left + c;
			const onEdge = r === -1 || r === 7 || c === -1 || c === 7;
			if (onEdge && rr >= 0 && rr < m.size && cc >= 0 && cc < m.size) {
				setModule(m, rr, cc, 0, true);
			}
		}
	}
};

export const placeAllFinders = (m: Matrix): void => {
	placeFinderAt(m, 0, 0);
	placeFinderAt(m, 0, m.size - 7); // top-right
	placeFinderAt(m, m.size - 7, 0); // bottom-left
};
