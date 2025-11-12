// src/matrix/timing.ts
import { Matrix, setModule } from "./types";

export const placeTimingPatterns = (m: Matrix): void => {
	// Horizontal timing at row 6, columns 8..size-9 inclusive for V1
	for (let c = 0; c < m.size; c++) {
		if (m.reserved[6][c]) continue;
		const bit: 0 | 1 = c % 2 === 0 ? 1 : 0;
		setModule(m, 6, c, bit, true);
	}

	// Vertical timing at column 6
	for (let r = 0; r < m.size; r++) {
		if (m.reserved[r][6]) continue;
		const bit: 0 | 1 = r % 2 === 0 ? 1 : 0;
		setModule(m, r, 6, bit, true);
	}
};
