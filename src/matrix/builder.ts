import type { VersionCapacity, VersionNumber } from "../metadata/capacity";
import { getVersionCapacity } from "../metadata/capacity";
import { placeAlignmentPatterns, placeDarkModule, placeFinderPatterns, placeTimingPatterns, reserveFormatAndVersionInfo } from "./patterns";
import { placeDataBits } from "./placement";
import { Matrix, makeMatrix } from "./types";

type VersionInput = VersionNumber | VersionCapacity;

const resolveVersionInfo = (version: VersionInput): VersionCapacity =>
	typeof version === "number" ? getVersionCapacity(version) : version;

export const buildMatrixScaffold = (version: VersionInput): Matrix => {
	const info = resolveVersionInfo(version);
	const size = 17 + 4 * info.version;
	const matrix = makeMatrix(size);

	placeFinderPatterns(matrix);
	placeTimingPatterns(matrix);
	placeAlignmentPatterns(matrix, info);
	placeDarkModule(matrix, info.version);
	reserveFormatAndVersionInfo(matrix, info.version);

	return matrix;
};

export const buildMatrix = (
	version: VersionInput,
	dataAndEcc: Uint8Array,
): Matrix => {
	const matrix = buildMatrixScaffold(version);
	placeDataBits(matrix, dataAndEcc);
	return matrix;
};
