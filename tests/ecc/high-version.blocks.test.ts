import { describe, expect, test } from "vitest";
import { prepareCodewords } from "../../src";
import { getCharCountBits, getVersionCapacity } from "../../src/metadata/capacity";
import type { EccLevel, VersionNumber } from "../../src/types";

const VERSIONS_TO_TEST: VersionNumber[] = [10, 20, 30, 40];
const ECC_LEVELS: readonly EccLevel[] = ["L", "M", "Q", "H"];
const MODE_INDICATOR_BITS = 4;

const getMaxPayloadLength = (version: VersionNumber, ecc: EccLevel): number => {
	const info = getVersionCapacity(version);
	const level = info.levels[ecc];
	const dataBits = level.dataCodewords * 8;
	const headerBits = MODE_INDICATOR_BITS + getCharCountBits("byte", version);
	const usableBits = Math.max(0, dataBits - headerBits);
	return Math.floor(usableBits / 8);
};

const buildPayload = (length: number): string => "Z".repeat(length);

describe("Higher-version block layouts", () => {
	for (const version of VERSIONS_TO_TEST) {
		const info = getVersionCapacity(version);

		describe(`version ${version}`, () => {
			for (const ecc of ECC_LEVELS) {
				const levelInfo = info.levels[ecc];

				test(`ECC ${ecc} matches metadata for block counts and interleaving`, () => {
					const payload = buildPayload(getMaxPayloadLength(version, ecc));
					const plan = prepareCodewords(payload, { version, ecc, mode: "byte" });

					expect(plan.blocks).toHaveLength(levelInfo.numBlocks);
					expect(plan.dataCodewords.length).toBe(levelInfo.dataCodewords);
					expect(plan.eccCodewords.length).toBe(
						levelInfo.numBlocks * levelInfo.eccCodewordsPerBlock,
					);
					expect(plan.interleavedCodewords.length).toBe(info.totalCodewords);

					const dataLengths = plan.blocks.map((block) => block.data.length);
					const minLen = Math.min(...dataLengths);
					const maxLen = Math.max(...dataLengths);
					expect(maxLen - minLen).toBeLessThanOrEqual(1);

					for (const block of plan.blocks) {
						expect(block.ecc.length).toBe(levelInfo.eccCodewordsPerBlock);
					}

					const firstColumn = plan.interleavedCodewords.slice(0, plan.blocks.length);
					expect(Array.from(firstColumn)).toEqual(
						plan.blocks.map((block) => block.data[0]),
					);
				});
			}
		});
	}
});
