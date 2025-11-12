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
