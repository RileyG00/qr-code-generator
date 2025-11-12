import {
	applyMask,
	maskPredicate,
	type MaskId,
	type QrMatrix,
} from "../src/mask/mask";

const makeMatrix = (size: number, fill: 0 | 1): QrMatrix => {
	const values = Array.from({ length: size }, () =>
		Array.from({ length: size }, () => fill),
	);
	const reserved = Array.from({ length: size }, () =>
		Array.from({ length: size }, () => false),
	);
	return { size, values, reserved };
};

const cloneValues = (values: QrMatrix["values"]): QrMatrix["values"] =>
	values.map((row) => row.slice());

test("applyMask preserves reserved cells", () => {
	const m = makeMatrix(5, 1);
	m.values[2][3] = 0;
	m.reserved[2][3] = true;

	const masked = applyMask(m, 0);
	expect(masked.values[2][3]).toBe(0);
});

test("applyMask toggles only when predicate is true (mask 0)", () => {
	const m = makeMatrix(4, 0);
	// mark (0,0) as reserved — should remain 0 even though predicate is true there
	m.reserved[0][0] = true;

	const pred = maskPredicate(0);
	const masked = applyMask(m, 0);

	for (let r = 0; r < m.size; r++) {
		for (let c = 0; c < m.size; c++) {
			const before = m.values[r][c];
			const after = masked.values[r][c];
			if (m.reserved[r][c]) {
				expect(after).toBe(before);
			} else {
				expect(after).toBe(pred(r, c) ? 1 : 0);
			}
		}
	}
});

test.each([0, 1, 2, 3, 4, 5, 6, 7] as MaskId[])(
	"mask %i predicate is defined",
	(id) => {
		const pred = maskPredicate(id);
		expect(typeof pred).toBe("function");
		expect(pred(0, 0)).toEqual(expect.any(Boolean));
	},
);

test("applyMask returns a new matrix and leaves the input untouched", () => {
	const m = makeMatrix(3, 0);
	m.values[0][1] = 1;
	const before = cloneValues(m.values);

	const masked = applyMask(m, 1);

	expect(masked).not.toBe(m);
	expect(masked.values).not.toBe(m.values);
	for (let r = 0; r < m.size; r++) {
		expect(masked.values[r]).not.toBe(m.values[r]);
	}
	expect(m.values).toEqual(before);
	expect(masked.reserved).toBe(m.reserved);
});

test("applyMask flips light and dark modules whenever the predicate matches", () => {
	const m = makeMatrix(4, 0);
	m.values[0][1] = 1; // ensure both colors exist where predicate is true (row 0 for mask 1)

	const masked = applyMask(m, 1);

	expect(masked.values[0][0]).toBe(1); // 0 -> 1
	expect(masked.values[0][1]).toBe(0); // 1 -> 0
	// row 1 should be untouched because predicate is false there
	expect(masked.values[1][0]).toBe(0);
	expect(masked.values[1][1]).toBe(0);
});

test("applyMask leaves null data cells unchanged even when predicate is true", () => {
	const m = makeMatrix(3, 0);
	m.values[0][0] = null;

	const masked = applyMask(m, 0);

	expect(masked.values[0][0]).toBeNull();
	expect(masked.values[0][2]).toBe(1); // mask 0 toggles here where (r + c) is even
});

describe("maskPredicate sample truth tables", () => {
	const predicateSamples: Array<{
		mask: MaskId;
		points: Array<{ rc: [number, number]; expected: boolean }>;
	}> = [
		{
			mask: 0,
			points: [
				{ rc: [0, 0], expected: true },
				{ rc: [0, 1], expected: false },
			],
		},
		{
			mask: 1,
			points: [
				{ rc: [0, 2], expected: true },
				{ rc: [1, 2], expected: false },
			],
		},
		{
			mask: 2,
			points: [
				{ rc: [0, 3], expected: true },
				{ rc: [2, 2], expected: false },
			],
		},
		{
			mask: 3,
			points: [
				{ rc: [1, 2], expected: true },
				{ rc: [2, 2], expected: false },
			],
		},
		{
			mask: 4,
			points: [
				{ rc: [0, 0], expected: true },
				{ rc: [3, 0], expected: false },
			],
		},
		{
			mask: 5,
			points: [
				{ rc: [0, 5], expected: true },
				{ rc: [1, 1], expected: false },
			],
		},
		{
			mask: 6,
			points: [
				{ rc: [2, 1], expected: true },
				{ rc: [1, 3], expected: false },
			],
		},
		{
			mask: 7,
			points: [
				{ rc: [0, 0], expected: true },
				{ rc: [1, 1], expected: false },
				{ rc: [3, 1], expected: true },
			],
		},
	];

	test.each(predicateSamples)(
		"mask %i predicate matches reference points",
		({ mask, points }) => {
			const pred = maskPredicate(mask);
			for (const { rc, expected } of points) {
				const [r, c] = rc;
				expect(pred(r, c)).toBe(expected);
			}
		},
	);
});

