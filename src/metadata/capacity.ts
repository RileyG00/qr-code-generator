import type { EccLevel, QRMode, VersionNumber } from "../types";

export interface EccBlockCapacity {
	dataCodewords: number;
	eccCodewordsPerBlock: number;
	numBlocks: number;
}

export interface VersionCapacity {
	version: VersionNumber;
	size: number;
	totalCodewords: number;
	alignments: readonly number[];
	requiresFormatInfo: true;
	requiresVersionInfo: boolean;
	levels: Record<EccLevel, EccBlockCapacity>;
}

const ALIGNMENT_PATTERN_TABLE = {
	1: [],
	2: [6, 18],
	3: [6, 22],
	4: [6, 26],
	5: [6, 30],
	6: [6, 34],
	7: [6, 22, 38],
	8: [6, 24, 42],
	9: [6, 26, 46],
	10: [6, 28, 50],
	11: [6, 30, 54],
	12: [6, 32, 58],
	13: [6, 34, 62],
	14: [6, 26, 46, 66],
	15: [6, 26, 48, 70],
	16: [6, 26, 50, 74],
	17: [6, 30, 54, 78],
	18: [6, 30, 56, 82],
	19: [6, 30, 58, 86],
	20: [6, 34, 62, 90],
	21: [6, 28, 50, 72, 94],
	22: [6, 26, 50, 74, 98],
	23: [6, 30, 54, 78, 102],
	24: [6, 28, 54, 80, 106],
	25: [6, 32, 58, 84, 110],
	26: [6, 30, 58, 86, 114],
	27: [6, 34, 62, 90, 118],
	28: [6, 26, 50, 74, 98, 122],
	29: [6, 30, 54, 78, 102, 126],
	30: [6, 26, 52, 78, 104, 130],
	31: [6, 30, 56, 82, 108, 134],
	32: [6, 26, 54, 82, 110, 138],
	33: [6, 30, 58, 86, 114, 142],
	34: [6, 34, 62, 90, 118, 146],
	35: [6, 30, 54, 78, 102, 126, 150],
	36: [6, 24, 50, 76, 102, 128, 154],
	37: [6, 28, 54, 80, 106, 132, 158],
	38: [6, 32, 58, 84, 110, 136, 162],
	39: [6, 26, 54, 82, 110, 138, 166],
	40: [6, 30, 58, 86, 114, 142, 170],
} as const satisfies Record<
	VersionNumber,
	readonly number[]
>;

const ECC_CODEWORDS_PER_BLOCK: Record<EccLevel, readonly number[]> = {
	L: [
		-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30,
		30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
	],
	M: [
		-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28,
		28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28,
	],
	Q: [
		-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30,
		30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
	],
	H: [
		-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30,
		30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
	],
};

const NUM_ERROR_CORRECTION_BLOCKS: Record<EccLevel, readonly number[]> = {
	L: [
		-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19,
		20, 21, 22, 24, 25,
	],
	M: [
		-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35,
		37, 38, 40, 43, 45, 47, 49,
	],
	Q: [
		-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48,
		51, 53, 56, 59, 62, 65, 68,
	],
	H: [
		-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57,
		60, 63, 66, 70, 74, 77, 81,
	],
};

const TOTAL_CODEWORDS: readonly number[] = [
	0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346, 404, 466, 532, 581, 655, 733, 815, 901, 991, 1085, 1156, 1258, 1364, 1474, 1588, 1706,
	1828, 1921, 2051, 2185, 2323, 2465, 2611, 2761, 2876, 3034, 3196, 3362, 3532, 3706,
];

const ECC_LEVELS: readonly EccLevel[] = ["L", "M", "Q", "H"];

export interface SelectionOptions {
	minVersion?: VersionNumber;
	maxVersion?: VersionNumber;
	ecc?: EccLevel;
}

export const VERSION_CAPACITIES: readonly VersionCapacity[] = Array.from({ length: 40 }, (_, idx) => {
	const version = (idx + 1) as VersionNumber;
	const size = 17 + 4 * version;
	const totalCodewords = TOTAL_CODEWORDS[version];
	const alignments = ALIGNMENT_PATTERN_TABLE[version];

	const levels = ECC_LEVELS.reduce<VersionCapacity["levels"]>((acc, level) => {
		const eccPerBlock = ECC_CODEWORDS_PER_BLOCK[level][version];
		const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[level][version];
		const dataCodewords = totalCodewords - eccPerBlock * numBlocks;
		acc[level] = { dataCodewords, eccCodewordsPerBlock: eccPerBlock, numBlocks };
		return acc;
	}, {} as VersionCapacity["levels"]);

	return {
		version,
		size,
		totalCodewords,
		alignments,
		levels,
		requiresFormatInfo: true,
		requiresVersionInfo: version >= 7,
	};
});

const MODE_INDICATOR_BITS = 4;

export const getVersionCapacity = (version: VersionNumber): VersionCapacity => {
	const entry = VERSION_CAPACITIES[version - 1];
	if (!entry) {
		throw new RangeError(`Unsupported QR version ${version}.`);
	}
	return entry;
};

export const getCharCountBits = (
	mode: QRMode,
	version: VersionNumber,
): number => {
	if (mode === "alphanumeric") {
		if (version <= 9) return 9;
		if (version <= 26) return 11;
		return 13;
	}

	return version <= 9 ? 8 : 16;
};

const getCharCountLimit = (mode: QRMode, version: VersionNumber): number =>
	(1 << getCharCountBits(mode, version)) - 1;

const getPayloadBitLength = (mode: QRMode, length: number): number => {
	if (mode === "alphanumeric") {
		const pairs = Math.floor(length / 2);
		const hasOdd = length % 2 === 1;
		return pairs * 11 + (hasOdd ? 6 : 0);
	}

	return length * 8;
};

export const canFitPayload = (
	mode: QRMode,
	inputLength: number,
	versionInfo: VersionCapacity,
	ecc: EccLevel,
): boolean => {
	if (inputLength > getCharCountLimit(mode, versionInfo.version)) {
		return false;
	}

	const capacityBits = versionInfo.levels[ecc].dataCodewords * 8;
	const charCountBits = getCharCountBits(mode, versionInfo.version);
	let bitsUsed =
		MODE_INDICATOR_BITS + charCountBits + getPayloadBitLength(mode, inputLength);

	if (bitsUsed > capacityBits) {
		return false;
	}

	const remainingAfterHeader = capacityBits - bitsUsed;
	const terminatorBits = Math.min(4, Math.max(0, remainingAfterHeader));
	bitsUsed += terminatorBits;

	const remainder = bitsUsed % 8;
	if (remainder !== 0) bitsUsed += 8 - remainder;

	return bitsUsed <= capacityBits;
};

export const selectVersionAndEcc = (
	mode: QRMode,
	inputLength: number,
	options?: SelectionOptions,
): { version: VersionNumber; ecc: EccLevel } => {
	if (inputLength < 0) {
		throw new Error("inputLength must be non-negative.");
	}

	const minVersion = options?.minVersion ?? 1;
	const maxVersion = options?.maxVersion ?? 40;
	if (minVersion < 1 || maxVersion > 40) {
		throw new RangeError("Version constraints must be within 1..40.");
	}
	if (minVersion > maxVersion) {
		throw new RangeError(
			`minVersion (${minVersion}) must be <= maxVersion (${maxVersion}).`,
		);
	}

	const allowedVersions = VERSION_CAPACITIES.filter(
		(info) => info.version >= minVersion && info.version <= maxVersion,
	);
	const eccLevels: readonly EccLevel[] = options?.ecc
		? [options.ecc]
		: ECC_LEVELS;

	for (const versionInfo of allowedVersions) {
		for (const ecc of eccLevels) {
			if (canFitPayload(mode, inputLength, versionInfo, ecc)) {
				return { version: versionInfo.version, ecc };
			}
		}
	}

	const eccLabel = options?.ecc ?? "any";
	throw new RangeError(
		`Input of ${inputLength} characters in mode ${mode} cannot fit in any version between ${minVersion} and ${maxVersion} with ECC ${eccLabel}.`,
	);
};
