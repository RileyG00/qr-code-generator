import { describe, expect, test } from "vitest";
import { encodeToMatrix, prepareCodewords } from "../../src";
import type { EccLevel, VersionNumber } from "../../src/types";
import {
	getByteModeCharCountBits,
	getVersionCapacity,
} from "../../src/metadata/capacity";

const ECC_LEVELS: readonly EccLevel[] = ["L", "M", "Q", "H"];
const MODE_INDICATOR_BITS = 4;

const getMaxPayloadLength = (
	version: VersionNumber,
	ecc: EccLevel,
): number => {
	const info = getVersionCapacity(version);
	const level = info.levels[ecc];
	const dataBits = level.dataCodewords * 8;
	const headerBits = MODE_INDICATOR_BITS + getByteModeCharCountBits(version);
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
				});

				expect(plan.version).toBe(typedVersion);
				expect(plan.ecc).toBe(ecc);
				expect(plan.dataCodewords.length).toBe(
					info.levels[ecc].dataCodewords,
				);
				expect(plan.interleavedCodewords.length).toBe(
					info.totalCodewords,
				);

				const matrix = encodeToMatrix(payload, {
					ecc,
					minVersion: typedVersion,
					maxVersion: typedVersion,
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
					}),
				).toThrow();

				expect(() =>
					encodeToMatrix(overPayload, {
						ecc,
						minVersion: typedVersion,
						maxVersion: typedVersion,
					}),
				).toThrow(/no version|does not fit/i);
			});
		}
	}
});
