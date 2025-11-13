import type {
	EccLevel,
	QRCodewords,
	QROptions,
	QRMode,
	VersionNumber,
} from "../types";
import {
	canFitPayload,
	getVersionCapacity,
	selectVersionAndEcc,
} from "../metadata/capacity";
import { encodeUtf8 } from "./byte-mode";
import { makeDataCodewords, type EncodedPayload } from "./data-codewords";
import {
	buildCodewordBlocks,
	concatEccFromBlocks,
	interleaveCodewordBlocks,
} from "./ecc-codewords";

const DEFAULT_ECC: EccLevel = "L";
const ALPHANUMERIC_CHARSET = /^[-$%*+./:0-9A-Z ]*$/;

const resolveMode = (input: string, opts?: QROptions): QRMode => {
	if (opts?.mode) {
		if (opts.mode === "byte") return "byte";
		if (opts.mode === "alphanumeric") {
			if (!ALPHANUMERIC_CHARSET.test(input)) {
				throw new Error("Input contains characters outside the QR alphanumeric set.");
			}
			return "alphanumeric";
		}
		throw new Error(
			`Unsupported mode "${opts.mode}". Only "byte" and "alphanumeric" are implemented.`,
		);
	}

	return ALPHANUMERIC_CHARSET.test(input) ? "alphanumeric" : "byte";
};

const resolveVersionAndEcc = (
	mode: QRMode,
	inputLength: number,
	opts?: QROptions,
): { version: VersionNumber; ecc: EccLevel } => {
	const minVersion = opts?.minVersion ?? 1;
	const maxVersion = opts?.maxVersion ?? 40;
	if (minVersion > maxVersion) {
		throw new RangeError(
			`minVersion (${minVersion}) must be <= maxVersion (${maxVersion}).`,
		);
	}

	if (opts?.version !== undefined) {
		if (opts.version < minVersion || opts.version > maxVersion) {
			throw new RangeError(
				`Version ${opts.version} is outside the allowed range ${minVersion}..${maxVersion}.`,
			);
		}

		const version = opts.version;
		const ecc: EccLevel = opts.ecc ?? DEFAULT_ECC;
		const info = getVersionCapacity(version);
		if (!canFitPayload(mode, inputLength, info, ecc)) {
			throw new RangeError(
				`Payload of ${inputLength} characters does not fit in version ${version} level ${ecc} for mode ${mode}.`,
			);
		}
		return { version, ecc };
	}

	return selectVersionAndEcc(mode, inputLength, {
		minVersion,
		maxVersion,
		ecc: opts?.ecc,
	});
};

export const prepareCodewords = (input: string, opts?: QROptions): QRCodewords => {
	const mode = resolveMode(input, opts);
	let encoded: EncodedPayload;
	if (mode === "byte") {
		const bytes = encodeUtf8(input);
		encoded = { mode: "byte", bytes, length: bytes.length };
	} else {
		encoded = { mode: "alphanumeric", text: input, length: input.length };
	}

	const payloadLength = encoded.length;
	const { version, ecc } = resolveVersionAndEcc(mode, payloadLength, opts);
	const versionInfo = getVersionCapacity(version);

	const dataCodewords = makeDataCodewords(encoded, versionInfo, ecc);
	const blocks = buildCodewordBlocks(dataCodewords, versionInfo, ecc);
	const eccCodewords = concatEccFromBlocks(blocks);
	const interleaved = interleaveCodewordBlocks(blocks);

	return {
		version,
		ecc,
		mode,
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
