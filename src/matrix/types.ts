export type Module = 0 | 1; // white/black
export type MaybeModule = Module | null;

export type Matrix = {
	size: number; // 21 for V1
	values: MaybeModule[][]; // null = unset, 0/1 = set
	reserved: boolean[][]; // true = function or format area
};

export const makeMatrix = (size: number): Matrix => {
	const values: MaybeModule[][] = Array.from({ length: size }, () =>
		Array.from({ length: size }, () => null),
	);
	const reserved: boolean[][] = Array.from({ length: size }, () =>
		Array.from({ length: size }, () => false),
	);
	return { size, values, reserved };
};

export const setModule = (
	m: Matrix,
	r: number,
	c: number,
	v: Module,
	reserve: boolean = false,
): void => {
	m.values[r][c] = v;
	if (reserve) m.reserved[r][c] = true;
};

export const reserveOnly = (m: Matrix, r: number, c: number): void => {
	m.reserved[r][c] = true;
};
