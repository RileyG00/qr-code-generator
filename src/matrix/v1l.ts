import { buildMatrix } from "./builder";
import type { Matrix } from "./types";

export const buildMatrixV1L_Unmasked = (dataAndEcc: Uint8Array): Matrix => {
	return buildMatrix(1, dataAndEcc);
};
