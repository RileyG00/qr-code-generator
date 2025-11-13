export type { Matrix, Module, MaybeModule } from "./types";
export { makeMatrix, setModule, reserveOnly } from "./types";
export { buildMatrix, buildMatrixScaffold } from "./builder";
export { placeDataBits, bytesToBitsMSB } from "./placement";
export {
	placeFinderPatterns,
	placeTimingPatterns,
	placeAlignmentPatterns,
	placeDarkModule,
	reserveFormatAndVersionInfo,
} from "./patterns";
