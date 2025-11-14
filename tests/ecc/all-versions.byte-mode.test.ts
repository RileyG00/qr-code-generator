import { describe, expect, test } from "vitest";
import { generateQrCode } from "../../src";
import { prepareCodewords } from "../../src/encoder";
import type { EccLevel, VersionNumber } from "../../src/types";
import { getCharCountBits, getVersionCapacity } from "../../src/metadata/capacity";

const ECC_LEVELS: readonly EccLevel[] = ["L", "M", "Q", "H"];
const MODE_INDICATOR_BITS = 4;

const getMaxPayloadLength = (
	version: VersionNumber,
	ecc: EccLevel,
): number => {
	const info = getVersionCapacity(version);
	const level = info.levels[ecc];
	const dataBits = level.dataCodewords * 8;
	const headerBits = MODE_INDICATOR_BITS + getCharCountBits("byte", version);
	const usableBits = Math.max(0, dataBits - headerBits);
	return Math.floor(usableBits / 8);
};

const buildPayload = (length: number): string => "X".repeat(length);

describe("Byte-mode capacity sweep across versions 1-40 and all ECC levels", () => {
	for (let version = 1 as VersionNumber; version <= 40; version++) {
		const typedVersion = version as VersionNumber;
		const info = getVersionCapacity(typedVersion);

		for (const ecc of ECC_LEVELS) {
			test(`version ${version} ECC ${ecc} accepts its full byte payload`, () => {
				const maxPayload = getMaxPayloadLength(typedVersion, ecc);
				expect(maxPayload).toBeGreaterThanOrEqual(0);

				const payload = buildPayload(maxPayload);
				const plan = prepareCodewords(payload, {
					version: typedVersion,
					ecc,
					mode: "byte",
				});

				expect(plan.version).toBe(typedVersion);
				expect(plan.ecc).toBe(ecc);
				expect(plan.dataCodewords.length).toBe(
					info.levels[ecc].dataCodewords,
				);
				expect(plan.interleavedCodewords.length).toBe(
					info.totalCodewords,
				);

				const matrix = generateQrCode(payload, {
					ecc,
					minVersion: typedVersion,
					maxVersion: typedVersion,
					mode: "byte",
				});

				expect(matrix.version).toBe(typedVersion);
				expect(matrix.ecc).toBe(ecc);
				expect(matrix.matrix.size).toBe(17 + 4 * version);
			});

			test(`version ${version} ECC ${ecc} rejects payloads above capacity`, () => {
				const maxPayload = getMaxPayloadLength(typedVersion, ecc);
				const overPayload = buildPayload(maxPayload + 1);

				expect(() =>
					prepareCodewords(overPayload, {
						version: typedVersion,
						ecc,
						mode: "byte",
					}),
				).toThrow();

				expect(() =>
					generateQrCode(overPayload, {
						ecc,
						minVersion: typedVersion,
						maxVersion: typedVersion,
						mode: "byte",
					}),
				).toThrow(/no version|does not fit|cannot fit/i);
			});
		}
	}
});

describe("Long payload matrix selection", () => {
	const LONG_PAYLOAD = (
		"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed vitae urna nec sapien tincidunt dignissim. Quisque vehicula nunc mattis hendrerit et eget efficitur mauris est sed purus. "
	).repeat(5);

	test("ensure baseline sample length is at least 500 chars", () => {
		expect(LONG_PAYLOAD.length).toBeGreaterThan(500);
	});

	for (const ecc of ECC_LEVELS) {
		test(`generateQrCode handles long payloads for ECC ${ecc}`, () => {
			const result = generateQrCode(LONG_PAYLOAD, { ecc });
			const info = getVersionCapacity(result.version);

			expect(result.version).toBeGreaterThanOrEqual(1);
			expect(result.matrix.size).toBe(17 + 4 * result.version);
			expect(result.ecc).toBe(ecc);
			expect(result.matrix.values.length).toBe(info.size);
			expect(result.matrix.values.every((row) => row.length === info.size)).toBe(true);
		});
	}
});
