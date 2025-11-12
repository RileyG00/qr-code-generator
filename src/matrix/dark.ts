import { Matrix, setModule } from "./types";

export const placeDarkModule = (m: Matrix): void => {
	const r: number = 4 * 1 + 9; // version = 1
	const c: number = 8;
	setModule(m, r, c, 1, true);
};
