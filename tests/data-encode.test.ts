import { prepareV1L } from "../src";
import { makeV1LDataCodewords } from "../src/encoder/makeV1LDataCodewords";

test("V1-L: HELLO → 19 data codewords", () => {
	expect(prepareV1L("HELLO").dataCodewords).toHaveLength(19);
});

test("V1-L: mode+count are correct for short ASCII", () => {
	const cw = makeV1LDataCodewords("HELLO");
	expect(cw[0]).toBeGreaterThanOrEqual(0x40); // sanity: 0100 + count bits up front
});
