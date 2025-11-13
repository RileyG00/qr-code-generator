import type { CodewordBlock, EccLevel } from "../types";
import type { VersionCapacity } from "../metadata/capacity";
import { makeGF256 } from "../math/gf256";
import { rsEncode } from "../rs/encode";

const gf = makeGF256(0x11d);

const sliceData = (source: Uint8Array, start: number, length: number): Uint8Array =>
	source.slice(start, start + length);

export const buildCodewordBlocks = (
	dataCodewords: Uint8Array,
	versionInfo: VersionCapacity,
	eccLevel: EccLevel,
): CodewordBlock[] => {
	const { dataCodewords: expectedData, eccCodewordsPerBlock, numBlocks } =
		versionInfo.levels[eccLevel];

	if (dataCodewords.length !== expectedData) {
		throw new RangeError(
			`Expected ${expectedData} data codewords for version ${versionInfo.version} level ${eccLevel}, received ${dataCodewords.length}.`,
		);
	}

	const totalCodewords = versionInfo.totalCodewords;
	const numLongBlocks = totalCodewords % numBlocks;
	const numShortBlocks = numBlocks - numLongBlocks;
	const shortBlockLength = Math.floor(totalCodewords / numBlocks);
	const longBlockLength = shortBlockLength + 1;
	const shortDataLength = shortBlockLength - eccCodewordsPerBlock;
	const longDataLength = longBlockLength - eccCodewordsPerBlock;

	const computedDataTotal =
		shortDataLength * numShortBlocks +
		longDataLength * (numBlocks - numShortBlocks);
	if (computedDataTotal !== expectedData) {
		throw new Error(
			`Computed data distribution ${computedDataTotal} does not match expected ${expectedData} for version ${versionInfo.version} level ${eccLevel}.`,
		);
	}

	const blocks: CodewordBlock[] = [];

	let offset = 0;
	for (let i = 0; i < numBlocks; i++) {
		const dataLength =
			i < numShortBlocks ? shortDataLength : longDataLength;
		const data = sliceData(dataCodewords, offset, dataLength);
		offset += dataLength;
		const ecc = rsEncode(gf, data, eccCodewordsPerBlock);
		blocks.push({ data, ecc });
	}

	return blocks;
};

export const interleaveCodewordBlocks = (
	blocks: readonly CodewordBlock[],
): Uint8Array => {
	if (blocks.length === 0) return new Uint8Array(0);

	const dataSection: number[] = [];
	const maxDataLength = Math.max(...blocks.map((b) => b.data.length));
	for (let i = 0; i < maxDataLength; i++) {
		for (const block of blocks) {
			if (i < block.data.length) dataSection.push(block.data[i]);
		}
	}

	const eccSection: number[] = [];
	const eccLength = blocks[0].ecc.length;
	for (let i = 0; i < eccLength; i++) {
		for (const block of blocks) {
			eccSection.push(block.ecc[i]);
		}
	}

	return Uint8Array.from([...dataSection, ...eccSection]);
};

export const concatEccFromBlocks = (
	blocks: readonly CodewordBlock[],
): Uint8Array => {
	const eccBytes: number[] = [];
	for (const block of blocks) {
		eccBytes.push(...block.ecc);
	}
	return Uint8Array.from(eccBytes);
};
