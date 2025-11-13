import type { QrMatrix } from "./types";

const ensureBinary = (
	values: ReadonlyArray<ReadonlyArray<0 | 1 | null>>,
): ReadonlyArray<ReadonlyArray<0 | 1>> => {
	for (let r = 0; r < values.length; r++) {
		const row = values[r];
		for (let c = 0; c < row.length; c++) {
			if (row[c] !== 0 && row[c] !== 1) {
				throw new Error(
					`Matrix contains null at (${r}, ${c}) during scoring.`,
				);
			}
		}
	}
	return values as ReadonlyArray<ReadonlyArray<0 | 1>>;
};

export const scoreRule1 = (
	valuesInput: ReadonlyArray<ReadonlyArray<0 | 1 | null>>,
): number => {
	const values = ensureBinary(valuesInput);
	const size = values.length;
	let penalty = 0;

	const scoreLine = (line: ReadonlyArray<0 | 1>): number => {
		let runColor = line[0];
		let runLen = 1;
		let score = 0;
		for (let i = 1; i < line.length; i++) {
			if (line[i] === runColor) runLen++;
			else {
				if (runLen >= 5) score += 3 + (runLen - 5);
				runColor = line[i];
				runLen = 1;
			}
		}
		if (runLen >= 5) score += 3 + (runLen - 5);
		return score;
	};

	for (let r = 0; r < size; r++) penalty += scoreLine(values[r]);
	for (let c = 0; c < size; c++) {
		const column: (0 | 1)[] = new Array(size);
		for (let r = 0; r < size; r++) column[r] = values[r][c];
		penalty += scoreLine(column);
	}

	return penalty;
};

export const scoreRule2 = (
	valuesInput: ReadonlyArray<ReadonlyArray<0 | 1 | null>>,
): number => {
	const values = ensureBinary(valuesInput);
	const size = values.length;
	let penalty = 0;

	for (let r = 0; r < size - 1; r++) {
		for (let c = 0; c < size - 1; c++) {
			const current = values[r][c];
			if (
				values[r][c + 1] === current &&
				values[r + 1][c] === current &&
				values[r + 1][c + 1] === current
			) {
				penalty += 3;
			}
		}
	}

	return penalty;
};

export const scoreRule3 = (
	valuesInput: ReadonlyArray<ReadonlyArray<0 | 1 | null>>,
): number => {
	const values = ensureBinary(valuesInput);
	const size = values.length;
	let penalty = 0;

	const matchesPattern = (line: ReadonlyArray<0 | 1>, start: number): boolean => {
		const pattern = [1, 0, 1, 1, 1, 0, 1] as const;
		const inverse = [0, 1, 0, 0, 0, 1, 0] as const;

		const test = (candidate: readonly (0 | 1)[]) =>
			candidate.every((bit, idx) => line[start + idx] === bit);

		if (start + 6 >= line.length) return false;

		if (test(pattern) || test(inverse)) {
			let leftZeros = 0;
			for (let i = start - 1; i >= 0 && line[i] === 0 && leftZeros < 4; i--)
				leftZeros++;
			let rightZeros = 0;
			for (
				let i = start + 7;
				i < line.length && line[i] === 0 && rightZeros < 4;
				i++
			)
				rightZeros++;
			return leftZeros >= 4 || rightZeros >= 4;
		}
		return false;
	};

	const scanLine = (line: ReadonlyArray<0 | 1>): number => {
		let score = 0;
		for (let i = 0; i <= line.length - 7; i++) {
			if (matchesPattern(line, i)) score += 40;
		}
		return score;
	};

	for (let r = 0; r < size; r++) penalty += scanLine(values[r]);
	for (let c = 0; c < size; c++) {
		const column: (0 | 1)[] = new Array(size);
		for (let r = 0; r < size; r++) column[r] = values[r][c];
		penalty += scanLine(column);
	}

	return penalty;
};

export const scoreRule4 = (
	valuesInput: ReadonlyArray<ReadonlyArray<0 | 1 | null>>,
): number => {
	const values = ensureBinary(valuesInput);
	const size = values.length;
	const totalModules = size * size;
	let darkModules = 0;

	for (let r = 0; r < size; r++) {
		for (let c = 0; c < size; c++) {
			if (values[r][c] === 1) darkModules++;
		}
	}

	const percentage = (darkModules * 100) / totalModules;
	const diff = Math.abs(percentage - 50);
	return 10 * Math.floor(diff / 5);
};

export const scoreMatrix = (matrix: QrMatrix): number =>
	scoreRule1(matrix.values) +
	scoreRule2(matrix.values) +
	scoreRule3(matrix.values) +
	scoreRule4(matrix.values);
