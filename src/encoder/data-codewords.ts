import type { EccLevel, QRMode } from "../types";
import type { VersionCapacity } from "../metadata/capacity";
import { getCharCountBits } from "../metadata/capacity";

const MODE_INDICATORS: Record<QRMode, number> = {
	byte: 0b0100,
	alphanumeric: 0b0010,
};

const ALPHANUMERIC_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
const ALPHANUMERIC_LOOKUP = new Map(
	ALPHANUMERIC_CHARSET.split("").map((char, idx) => [char, idx]),
);

const PAD_BYTES = [0xec, 0x11];

const toBits = (value: number, width: number): number[] => {
	if (width <= 0) return [];
	return Array.from({ length: width }, (_, idx) => (value >> (width - 1 - idx)) & 1);
};

const bitsToBytes = (bits: number[]): Uint8Array => {
	const out = new Uint8Array(bits.length / 8);
	for (let i = 0; i < out.length; i++) {
		let value = 0;
		for (let j = 0; j < 8; j++) {
			value = (value << 1) | (bits[i * 8 + j] ?? 0);
		}
		out[i] = value;
	}
	return out;
};

export type EncodedPayload =
	| { mode: "byte"; bytes: Uint8Array; length: number }
	| { mode: "alphanumeric"; text: string; length: number };

const appendAlphanumericBits = (bits: number[], text: string): void => {
	for (let i = 0; i < text.length; i += 2) {
		const first = ALPHANUMERIC_LOOKUP.get(text[i]);
		if (first === undefined) {
			throw new Error(`Character "${text[i]}" is not valid in alphanumeric mode.`);
		}

		if (i + 1 < text.length) {
			const second = ALPHANUMERIC_LOOKUP.get(text[i + 1]);
			if (second === undefined) {
				throw new Error(`Character "${text[i + 1]}" is not valid in alphanumeric mode.`);
			}
			bits.push(...toBits(first * 45 + second, 11));
		} else {
			bits.push(...toBits(first, 6));
		}
	}
};

export const makeDataCodewords = (
	payload: EncodedPayload,
	versionInfo: VersionCapacity,
	eccLevel: EccLevel,
): Uint8Array => {
	const dataCapacityBytes = versionInfo.levels[eccLevel].dataCodewords;
	const dataCapacityBits = dataCapacityBytes * 8;
	const charCountBits = getCharCountBits(payload.mode, versionInfo.version);
	const maxChars = (1 << charCountBits) - 1;

	if (payload.length > maxChars) {
		throw new RangeError(
			`Payload of ${payload.length} characters exceeds ${payload.mode} capacity for version ${versionInfo.version}.`,
		);
	}

	const bits: number[] = [];
	bits.push(...toBits(MODE_INDICATORS[payload.mode], 4));
	bits.push(...toBits(payload.length, charCountBits));

	if (payload.mode === "byte") {
		for (let i = 0; i < payload.bytes.length; i++) {
			bits.push(...toBits(payload.bytes[i], 8));
		}
	} else {
		appendAlphanumericBits(bits, payload.text);
	}

	if (bits.length > dataCapacityBits) {
		throw new RangeError(
			`Payload requires ${bits.length} bits before padding, exceeding the data capacity (${dataCapacityBits}) for version ${versionInfo.version} level ${eccLevel}.`,
		);
	}

	const capacityRemaining = dataCapacityBits - bits.length;
	const terminatorBits = Math.min(4, Math.max(0, capacityRemaining));
	for (let i = 0; i < terminatorBits; i++) bits.push(0);

	while (bits.length % 8 !== 0) bits.push(0);

	if (bits.length > dataCapacityBits) {
		throw new RangeError(
			`Alignment padding pushed the payload beyond capacity for version ${versionInfo.version} level ${eccLevel}.`,
		);
	}

	const dataBytes = bitsToBytes(bits);
	if (dataBytes.length > dataCapacityBytes) {
		throw new RangeError(
			`Data segment consumed ${dataBytes.length} codewords but only ${dataCapacityBytes} are allowed for version ${versionInfo.version} level ${eccLevel}.`,
		);
	}

	const codewords = new Uint8Array(dataCapacityBytes);
	codewords.set(dataBytes, 0);

	let padIndex = 0;
	for (let i = dataBytes.length; i < dataCapacityBytes; i++) {
		codewords[i] = PAD_BYTES[padIndex];
		padIndex ^= 1;
	}

	return codewords;
};
