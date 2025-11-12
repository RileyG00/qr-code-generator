import { Matrix } from "./types";
import { buildScaffoldV1 } from "./build";
import { placeDataBitsV1 } from "./placeData";

export const buildMatrixV1L_Unmasked = (dataAndEcc: Uint8Array): Matrix => {
	const m: Matrix = buildScaffoldV1();
	placeDataBitsV1(m, dataAndEcc);
	return m;
};
