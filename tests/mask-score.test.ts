import { applyMask, type QrMatrix } from "../src/mask/apply";
import {
	scoreRule1,
	scoreRule2,
	scoreRule3,
	scoreRule4,
	scoreMatrix,
} from "../src/mask/score";
import { chooseBestMask } from "../src/mask";

/** Helpers */
const mk = (values: number[][]): QrMatrix => {
	const size = values.length;
	const v = values.map((r) => r.map((x) => x as 0 | 1));
	const reserved = Array.from({ length: size }, () =>
		Array.from({ length: size }, () => false),
	);
	return { size, values: v, reserved };
};

/** Build an N×N matrix initialized with a value factory (0|1). */
const makeSquare = (
	n: number,
	fn: (r: number, c: number) => 0 | 1,
): (0 | 1)[][] => {
	const v: (0 | 1)[][] = new Array(n);
	for (let r = 0; r < n; r++) {
		const row: (0 | 1)[] = new Array(n);
		for (let c = 0; c < n; c++) row[c] = fn(r, c);
		v[r] = row;
	}
	return v;
};

/** Clone values grid */
const clone = (v: (0 | 1)[][]): (0 | 1)[][] => v.map((row) => row.slice());

// ---------------------------------------------------------------------------
// Rule 2
// ---------------------------------------------------------------------------

test("rule2 penalizes a single 2x2 block (+3)", () => {
	const m = mk([
		[1, 1, 0],
		[1, 1, 0],
		[0, 0, 0],
	]);
	expect(scoreRule2(m.values)).toBe(3);
});

test("rule2 counts overlapping 2x2 blocks in a full 3x3 dark square (4 blocks => +12)", () => {
	const v = makeSquare(3, () => 1);
	expect(scoreRule2(v)).toBe(12);
});

test("rule2 counts multiple separated blocks", () => {
	const v = mk([
		[1, 1, 0, 0],
		[1, 1, 0, 0],
		[0, 0, 1, 1],
		[0, 0, 1, 1],
	]).values;
	// four 2x2 blocks
	expect(scoreRule2(v)).toBe(3 * 4);
});

test("rule2 gives 0 for checkerboard (no 2x2 same-color)", () => {
	const v = makeSquare(8, (r, c) => ((r + c) & 1 ? 1 : 0) as 0 | 1);
	expect(scoreRule2(v)).toBe(0);
});

// ---------------------------------------------------------------------------
// Rule 4
// ---------------------------------------------------------------------------

test("rule4 is 0 at ~50% dark", () => {
	const n = 10;
	const v = makeSquare(n, () => 0);
	// set exactly 50 dark (10x10 => 100 cells)
	let count = 0;
	for (let r = 0; r < n; r++) {
		for (let c = 0; c < n && count < 50; c++) {
			v[r][c] = 1;
			count++;
		}
	}
	expect(scoreRule4(v)).toBe(0);
});

test("rule4 grows 10 per 5% away from 50%", () => {
	const n = 20; // 400 cells
	const v55 = makeSquare(n, () => 0);
	// 55% => 220 dark
	let d = 0;
	for (let r = 0; r < n; r++)
		for (let c = 0; c < n && d < 220; c++) {
			v55[r][c] = 1;
			d++;
		}
	expect(scoreRule4(v55)).toBe(10);

	const v60 = makeSquare(n, () => 0);
	d = 0;
	for (let r = 0; r < n; r++)
		for (let c = 0; c < n && d < 240; c++) {
			v60[r][c] = 1;
			d++;
		}
	expect(scoreRule4(v60)).toBe(20);
});

test("rule4 extremes 0%/100% => 100", () => {
	const v0 = makeSquare(12, () => 0);
	expect(scoreRule4(v0)).toBe(100);
	const v1 = makeSquare(12, () => 1);
	expect(scoreRule4(v1)).toBe(100);
});

// ---------------------------------------------------------------------------
// Rule 1
// ---------------------------------------------------------------------------

describe("scoreRule1 — runs of ≥5", () => {
	test("no runs ≥5 gives 0 (checkerboard)", () => {
		const v = makeSquare(15, (r, c) => ((r + c) & 1 ? 1 : 0) as 0 | 1);
		expect(scoreRule1(v)).toBe(0);
	});

	test("exactly 5 in a row => +3", () => {
		const n = 10;
		// Checkerboard baseline => no runs ≥5 anywhere
		const v = makeSquare(n, (r, c) => ((r + c) & 1 ? 1 : 0) as 0 | 1);

		// Force exactly 5 consecutive 1s in row 4 at cols [2..6]
		for (let c = 2; c <= 6; c++) v[4][c] = 1;

		// Guard both sides so the run doesn't extend
		v[4][1] = 0;
		v[4][7] = 0;

		// Columns remain alternating around row 4, so no vertical run ≥5
		expect(scoreRule1(v)).toBe(3);
	});

	test("a 10-long row run => +3+(10-5)=+8", () => {
		const n = 14;
		// Checkerboard baseline => no incidental long runs
		const v = makeSquare(n, (r, c) => ((r + c) & 1 ? 1 : 0) as 0 | 1);

		// Force exactly 10 consecutive 1s in row 7 at cols [2..11]
		for (let c = 2; c <= 11; c++) v[7][c] = 1;

		// Guard both sides so it doesn't extend into neighbors
		v[7][1] = 0; // left guard
		v[7][12] = 0; // right guard

		// Only one qualifying run: length 10 => 3 + (10 - 5) = 8
		expect(scoreRule1(v)).toBe(8);
	});

	test("multiple runs add up (row + col) with guarded boundaries", () => {
		const n = 12;
		const v: (0 | 1)[][] = Array.from({ length: n }, (_, r) =>
			Array.from({ length: n }, (_, c) => ((r + c) % 2 ? 1 : 0) as 0 | 1),
		);
		// Row: exactly 8 consecutive 1s in row 1 => +6
		for (let c = 2; c <= 9; c++) v[1][c] = 1;
		v[1][1] = 0;
		v[1][10] = 0; // guards
		// Column: exactly 5 consecutive 0s in col 7 => +3
		for (let r = 4; r <= 8; r++) v[r][7] = 0;
		v[3][7] = 1;
		v[9][7] = 1; // guards
		expect(scoreRule1(v)).toBe(6 + 3);
	});

	test("edge run at left boundary still counts", () => {
		const n = 12;
		// checkerboard baseline => no runs ≥ 2 anywhere
		const v = makeSquare(n, (r, c) => ((r + c) & 1 ? 1 : 0) as 0 | 1);

		// make a 6-long run of 1s starting at col 0 in row 2
		for (let c = 0; c <= 5; c++) v[2][c] = 1;
		// guard the right edge so it doesn't extend
		v[2][6] = 0;

		// Only one qualifying run: length 6 => 3 + (6 - 5) = 4
		expect(scoreRule1(v)).toBe(4);
	});
});

// ---------------------------------------------------------------------------
// Rule 3
// ---------------------------------------------------------------------------

describe("scoreRule3 — finder-like patterns 1011101 / 0100010 (± quiet zone)", () => {
	test("row occurrence with ≥4 light modules on the left (+40)", () => {
		const n = 15;
		const v = makeSquare(n, () => 1);
		const r = 5;
		for (let c = 0; c <= 3; c++) v[r][c] = 0; // left quiet zone
		const pattern = [1, 0, 1, 1, 1, 0, 1] as const;
		for (let i = 0; i < pattern.length; i++) v[r][4 + i] = pattern[i];
		expect(scoreRule3(v)).toBe(40);
	});

	test("column occurrence with ≥4 light modules after pattern (+40)", () => {
		const n = 15;
		const v = makeSquare(n, () => 1);
		const c = 7;
		const pattern = [1, 0, 1, 1, 1, 0, 1] as const;
		for (let i = 0; i < pattern.length; i++) v[4 + i][c] = pattern[i];
		for (let r = 11; r <= 14; r++) v[r][c] = 0; // quiet zone below
		expect(scoreRule3(v)).toBe(40);
	});

	test("inverse pattern (0100010) with quiet zone counts", () => {
		const n = 15;
		const v = makeSquare(n, () => 1);
		const r = 8;
		for (let c = 0; c <= 3; c++) v[r][c] = 0; // left quiet zone
		const inv = [0, 1, 0, 0, 0, 1, 0] as const;
		for (let i = 0; i < inv.length; i++) v[r][4 + i] = inv[i];
		expect(scoreRule3(v)).toBe(40);
	});

	test("does NOT count when quiet zone < 4 on both sides", () => {
		const n = 13;
		const v = makeSquare(n, () => 1);
		const r = 6;
		for (let c = 0; c <= 2; c++) v[r][c] = 0; // only 3 zeros
		const pattern = [1, 0, 1, 1, 1, 0, 1] as const;
		for (let i = 0; i < pattern.length; i++) v[r][3 + i] = pattern[i];
		expect(scoreRule3(v)).toBe(0);
	});

	test("counts multiple disjoint occurrences in one row", () => {
		const n = 25;
		const v = makeSquare(n, () => 1);
		const r = 10;
		// Left quiet zone for first
		for (let c = 0; c <= 3; c++) v[r][c] = 0;
		const pat = [1, 0, 1, 1, 1, 0, 1] as const;
		for (let i = 0; i < pat.length; i++) v[r][4 + i] = pat[i];
		// Right quiet zone for second occurrence later in row
		const start2 = 14;
		for (let c = start2 + 7; c < start2 + 11; c++) v[r][c] = 0; // 4 zeros to the right of second
		for (let i = 0; i < pat.length; i++) v[r][start2 + i] = pat[i];
		expect(scoreRule3(v)).toBe(80);
	});

	test("edge case: pattern at col 0 with quiet zone only on the right is valid", () => {
		const n = 20;
		const v = makeSquare(n, () => 1);
		const r = 12;
		const pat = [1, 0, 1, 1, 1, 0, 1] as const;
		// place at [0..6]
		for (let i = 0; i < pat.length; i++) v[r][i] = pat[i];
		// provide ≥4 zeros to the right
		for (let c = 7; c <= 10; c++) v[r][c] = 0;
		expect(scoreRule3(v)).toBe(40);
	});
});

// ---------------------------------------------------------------------------
// scoreMatrix aggregate
// ---------------------------------------------------------------------------

test("scoreMatrix equals sum of individual rule scores", () => {
	const v = makeSquare(21, (r, c) => ((r * 7 + c * 11) % 3 ? 1 : 0) as 0 | 1);
	const total = scoreMatrix({
		size: v.length,
		values: v,
		reserved: Array.from({ length: v.length }, () =>
			Array.from({ length: v.length }, () => false),
		),
	});
	const s1 = scoreRule1(v);
	const s2 = scoreRule2(v);
	const s3 = scoreRule3(v);
	const s4 = scoreRule4(v);
	expect(total).toBe(s1 + s2 + s3 + s4);
});

// ---------------------------------------------------------------------------
// chooseBestMask
// ---------------------------------------------------------------------------

test("chooseBestMask returns a valid mask with applied matrix", () => {
	const base = mk(Array.from({ length: 21 }, () => Array(21).fill(0)));
	base.values[10][10] = 1; // sample data
	const res = chooseBestMask(base);
	expect(res.matrix.size).toBe(21);
	expect(res.maskId).toBeGreaterThanOrEqual(0);
	expect(res.maskId).toBeLessThanOrEqual(7);
	expect(scoreMatrix(res.matrix)).toBe(res.score);
});

// sanity: masking changes score for non-trivial matrices

test("different masks can yield different scores", () => {
	const base = mk(
		Array.from({ length: 25 }, (_, r) =>
			Array.from({ length: 25 }, (_, c) => ((r + c) & 1) as 0 | 1),
		),
	);
	const s0 = scoreMatrix(applyMask(base, 0));
	const s1 = scoreMatrix(applyMask(base, 1));
	expect(s0).not.toBe(s1);
});

// reserved areas preservation through chooseBestMask

test("chooseBestMask preserves reserved modules exactly", () => {
	const size = 25;
	const values: (0 | 1 | null)[][] = makeSquare(size, () => 0);
	const reserved: boolean[][] = makeSquare(
		size,
		() => 0,
	) as unknown as boolean[][];
	// make a cross of reserved cells with alternating values
	for (let i = 0; i < size; i++) {
		values[12][i] = (i % 2 ? 1 : 0) as 0 | 1;
		values[i][7] = (i % 2 ? 0 : 1) as 0 | 1;
		reserved[12][i] = true;
		reserved[i][7] = true;
	}
	const base: QrMatrix = { size, values, reserved };
	const res = chooseBestMask(base);
	for (let i = 0; i < size; i++) {
		expect(res.matrix.values[12][i]).toBe(values[12][i]);
		expect(res.matrix.values[i][7]).toBe(values[i][7]);
	}
});

// deterministic choice given identical input

test("chooseBestMask is deterministic for the same input", () => {
	const base = mk(
		Array.from({ length: 29 }, (_, r) =>
			Array.from(
				{ length: 29 },
				(_, c) => ((r * 3 + c * 5) % 7 ? 1 : 0) as 0 | 1,
			),
		),
	);
	const a = chooseBestMask(base);
	const b = chooseBestMask(base);
	expect(a.maskId).toBe(b.maskId);
	expect(a.score).toBe(b.score);
});

test("chooseBestMask decorator runs before scoring for every mask", () => {
	const base = mk(
		Array.from({ length: 21 }, (_, r) =>
			Array.from({ length: 21 }, (_, c) => ((r + c) % 2) as 0 | 1),
		),
	);
	const seen = new Set<number>();
	chooseBestMask(base, undefined, {
		decorateCandidate: (_matrix, id) => {
			seen.add(id);
		},
	});
	expect(seen.size).toBe(8);
	for (let id = 0; id <= 7; id++) expect(seen.has(id)).toBe(true);
});

// ---------------------------------------------------------------------------
// Robustness: ensureBinary guard (nulls should throw when scoring)
// ---------------------------------------------------------------------------

test("scoreMatrix throws if any nulls remain in values", () => {
	const size = 9;
	const values: (0 | 1 | null)[][] = makeSquare(size, () => 0);
	values[3][4] = null; // simulate pipeline slip
	const reserved = Array.from({ length: size }, () =>
		Array.from({ length: size }, () => false),
	);
	expect(() => scoreMatrix({ size, values, reserved })).toThrow(/null/);
});
