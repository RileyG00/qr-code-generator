import { makeV1LDataCodewords } from "./encoder/makeV1LDataCodewords";
import { QROptions, QRCodewords } from "./types";
import { V1_SIZE } from "./constants/v1l";
import { makeV1LEcc } from "./encoder/makeV1LEcc";

export const prepareV1L = (input: string, _opts?: QROptions): QRCodewords => {
	const dataCodewords = makeV1LDataCodewords(input, _opts);
	const eccCodewords = Array.from(makeV1LEcc(dataCodewords));
	const allCodewords = [...dataCodewords, ...eccCodewords];

	return {
		version: 1,
		ecc: "L",
		dataCodewords,
		eccCodewords,
		allCodewords,
	};
};

export const prepareV1LWithEcc = (
	input: string,
	_opts?: QROptions,
): QRCodewords & { totalCodewords: number } => {
	const prepared = prepareV1L(input, _opts);
	return {
		...prepared,
		totalCodewords:
			prepared.allCodewords?.length ??
			prepared.dataCodewords.length + prepared.eccCodewords.length,
	};
};

export const getPlannedMatrixSize = (): number => V1_SIZE;
