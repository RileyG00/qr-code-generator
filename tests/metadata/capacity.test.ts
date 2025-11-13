import { describe, expect, test } from "vitest";
import { getVersionCapacity } from "../../src/metadata/capacity";

describe("Version metadata helpers", () => {
	test("versions >= 7 require version info, lower versions do not", () => {
		for (let version = 1; version <= 40; version++) {
			const info = getVersionCapacity(version);
			if (version >= 7) {
				expect(info.requiresVersionInfo).toBe(true);
			} else {
				expect(info.requiresVersionInfo).toBe(false);
			}
		}
	});

	test("alignment pattern coordinates stay in ascending order with expected lengths", () => {
		const expectations: Record<number, number[]> = {
			1: [],
			2: [6, 18],
			7: [6, 22, 38],
			20: [6, 34, 62, 90],
			40: [6, 30, 58, 86, 114, 142, 170],
		};

		for (const [versionStr, expected] of Object.entries(expectations)) {
			const version = Number(versionStr);
			const info = getVersionCapacity(version);
			expect(info.alignments).toEqual(expected);
			expect([...info.alignments]).toEqual(
				[...info.alignments].sort((a, b) => a - b),
			);
		}
	});

	test("total codewords align with QR spec entries for sample versions", () => {
		const samples: Record<number, number> = {
			1: 26,
			5: 134,
			10: 346,
			20: 1085,
			40: 3706,
		};

		for (const [versionStr, total] of Object.entries(samples)) {
			const version = Number(versionStr);
			expect(getVersionCapacity(version).totalCodewords).toBe(total);
		}
	});
});
