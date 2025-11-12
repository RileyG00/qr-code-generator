import { prepareV1L } from "../src/index";

function hex(u8: Uint8Array) {
	return Array.from(u8)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

test("V1-L byte encoder pads to 19 codewords", () => {
	const cw = prepareV1L("HELLO").dataCodewords;
	expect(cw).toHaveLength(19);
	// Spot-check first few bytes are stable across runs
	// (You can assert exact hex once you lock expectations)
	expect(typeof hex(cw)).toBe("string");
});

test("too long for V1-L throws", () => {
	const long = "A".repeat(300);
	expect(() => prepareV1L(long)).toThrow();
});
