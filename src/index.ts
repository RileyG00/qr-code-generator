import { makeV1LDataCodewords } from "./encoder/makeV1LDataCodewords";
import { QROptions, QRCodewords } from "./types";
import { V1_SIZE } from "./constants/v1l";
import { makeV1LEcc } from "./encoder/makeV1LEcc";

export const prepareV1L = (input: string, _opts?: QROptions): QRCodewords => {
	const dataCodewords: number[] = makeV1LDataCodewords(input, _opts);
	return { version: 1, ecc: "L", dataCodewords };
};

export const prepareV1LWithEcc = (input: string, _opts?: QROptions) => {
	const { dataCodewords } = prepareV1L(input, _opts);
	const ecCodewords = makeV1LEcc(dataCodewords);
	return {
		version: 1 as const,
		ecc: "L" as const,
		dataCodewords,
		ecCodewords,
		totalCodewords: dataCodewords.length + ecCodewords.length, // 26
	};
};

export const getPlannedMatrixSize = (): number => V1_SIZE;
