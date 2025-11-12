import { makeGF256 } from "../math/gf256";
import { rsEncode } from "../rs/encode";

export const makeV1LEcc = (
	dataCodewords: Uint8Array | number[],
): Uint8Array => {
	const gf = makeGF256(0x11d);
	const data =
		dataCodewords instanceof Uint8Array
			? dataCodewords
			: Uint8Array.from(dataCodewords);
	return rsEncode(gf, data, 7);
};
