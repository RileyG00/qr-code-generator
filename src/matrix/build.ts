import { Matrix, makeMatrix } from "./types";
import { placeAllFinders } from "./finder";
import { placeTimingPatterns } from "./timing";
import { placeDarkModule } from "./dark";
import { reserveFormatInfo } from "./format";
import { reserveVersionInfo } from "./version";

export const buildScaffoldV1 = (): Matrix => {
	const m: Matrix = makeMatrix(21);
	placeAllFinders(m);
	placeTimingPatterns(m);
	placeDarkModule(m);
	reserveFormatInfo(m);
	reserveVersionInfo(m, 1);
	return m;
};
