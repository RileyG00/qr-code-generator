import { describe, expect, test } from "vitest";
import { prepareCodewords } from "../../../src";
import { getVersionCapacity } from "../../../src/metadata/capacity";

describe("Generic encoder blocks (ECC L)", () => {
	test("Version 6-L splits data into correct block sizes and interleaves", () => {
		const payload = "ABCDEFGHIJKLMNOPQRSTUVWX".repeat(4); // 96 bytes
		const version = 6;
		const ecc = "L";
		const plan = prepareCodewords(payload, { version, ecc });
		const info = getVersionCapacity(version);
		const levelInfo = info.levels[ecc];

		expect(plan.blocks).toHaveLength(levelInfo.numBlocks);
		expect(plan.dataCodewords.length).toBe(levelInfo.dataCodewords);
		expect(plan.eccCodewords.length).toBe(levelInfo.numBlocks * levelInfo.eccCodewordsPerBlock);
		expect(plan.interleavedCodewords.length).toBe(info.totalCodewords);

		const uniqueDataLengths = new Set(plan.blocks.map((b) => b.data.length));
		expect(uniqueDataLengths.size).toBeLessThanOrEqual(2);
		expect(
			plan.blocks.reduce((sum, block) => sum + block.data.length, 0),
		).toBe(levelInfo.dataCodewords);

		for (const block of plan.blocks) {
			expect(block.ecc.length).toBe(levelInfo.eccCodewordsPerBlock);
		}

		const firstColumn = plan.interleavedCodewords.slice(0, plan.blocks.length);
		expect(Array.from(firstColumn)).toEqual(
			plan.blocks.map((block) => block.data[0]),
		);

		const eccSection = plan.interleavedCodewords.slice(
			info.totalCodewords - levelInfo.eccCodewordsPerBlock * levelInfo.numBlocks,
		);
		expect(eccSection.length).toBe(
			levelInfo.eccCodewordsPerBlock * levelInfo.numBlocks,
		);
	});
});
