import type { QROptions, QRCodewords, EccLevel, VersionNumber } from "../types";
import {
	VERSION_CAPACITIES,
	canFitByteModePayload,
	getVersionCapacity,
	selectVersionAndEcc,
} from "../metadata/capacity";
import { encodeUtf8 } from "./byte-mode";
import { makeDataCodewords } from "./data-codewords";
import {
	buildCodewordBlocks,
	concatEccFromBlocks,
	interleaveCodewordBlocks,
} from "./ecc-codewords";

const DEFAULT_ECC: EccLevel = "L";

const resolveVersionAndEcc = (
	byteLength: number,
	opts?: QROptions,
): { version: VersionNumber; ecc: EccLevel } => {
	if (opts?.mode && opts.mode !== "byte") {
		throw new Error(`Unsupported mode "${opts.mode}". Only byte mode is implemented.`);
	}

	if (opts?.version !== undefined) {
		const version = opts.version;
		const ecc: EccLevel = opts.ecc ?? DEFAULT_ECC;
		const info = getVersionCapacity(version);
		if (!canFitByteModePayload(byteLength, info, ecc)) {
			throw new RangeError(
				`Payload of ${byteLength} bytes does not fit in version ${version} level ${ecc}.`,
			);
		}
		return { version, ecc };
	}

	if (opts?.ecc) {
		for (const info of VERSION_CAPACITIES) {
			if (canFitByteModePayload(byteLength, info, opts.ecc)) {
				return { version: info.version, ecc: opts.ecc };
			}
		}
		throw new RangeError(
			`Payload of ${byteLength} bytes does not fit in any version with ECC level ${opts.ecc}.`,
		);
	}

	const bits = byteLength * 8;
	return selectVersionAndEcc(bits, "byte");
};

export const prepareCodewords = (input: string, opts?: QROptions): QRCodewords => {
	const payload = encodeUtf8(input);
	const { version, ecc } = resolveVersionAndEcc(payload.length, opts);
	const versionInfo = getVersionCapacity(version);

	const dataCodewords = makeDataCodewords(payload, versionInfo, ecc);
	const blocks = buildCodewordBlocks(dataCodewords, versionInfo, ecc);
	const eccCodewords = concatEccFromBlocks(blocks);
	const interleaved = interleaveCodewordBlocks(blocks);

	return {
		version,
		ecc,
		mode: "byte",
		dataCodewords,
		eccCodewords,
		interleavedCodewords: interleaved,
		blocks,
		allCodewords: interleaved,
	};
};

export { makeDataCodewords } from "./data-codewords";
export {
	buildCodewordBlocks,
	concatEccFromBlocks,
	interleaveCodewordBlocks,
} from "./ecc-codewords";
