import type { EccLevel } from "../types";
import type { VersionCapacity } from "../metadata/capacity";
import { getByteModeCharCountBits } from "../metadata/capacity";

const MODE_INDICATOR_BYTE = 0b0100;
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

export const makeDataCodewords = (
	payload: Uint8Array,
	versionInfo: VersionCapacity,
	eccLevel: EccLevel,
): Uint8Array => {
	const dataCapacityBytes = versionInfo.levels[eccLevel].dataCodewords;
	const dataCapacityBits = dataCapacityBytes * 8;
	const charCountBits = getByteModeCharCountBits(versionInfo.version);
	const maxChars = (1 << charCountBits) - 1;

	if (payload.length > maxChars) {
		throw new RangeError(
			`Payload of ${payload.length} bytes exceeds byte-mode capacity for version ${versionInfo.version}.`,
		);
	}

	const bits: number[] = [];
	// Mode indicator
	bits.push(...toBits(MODE_INDICATOR_BYTE, 4));
	// Character count
	bits.push(...toBits(payload.length, charCountBits));
	// Data bytes
	for (let i = 0; i < payload.length; i++) {
		bits.push(...toBits(payload[i], 8));
	}

	if (bits.length > dataCapacityBits) {
		throw new RangeError(
			`Payload requires ${bits.length} bits before padding, exceeding the data capacity (${dataCapacityBits}) for version ${versionInfo.version} level ${eccLevel}.`,
		);
	}

	const capacityRemaining = dataCapacityBits - bits.length;
	const terminatorBits = Math.min(4, capacityRemaining);
	for (let i = 0; i < terminatorBits; i++) bits.push(0);

	while (bits.length % 8 !== 0) bits.push(0);

	if (bits.length > dataCapacityBits) {
		throw new RangeError(
			`Byte alignment pushed the payload beyond capacity for version ${versionInfo.version} level ${eccLevel}.`,
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

export { MODE_INDICATOR_BYTE };
