import { describe, expect, test } from "vitest";
import { generateQrCode } from "../src";
import { prepareCodewords } from "../src/encoder";

describe("encoder mode guards", () => {
	test("prepareCodewords rejects unsupported modes", () => {
		expect(() =>
			prepareCodewords("HELLO", { mode: "numeric" as never }),
		).toThrow(/unsupported mode/i);
	});

	test("generateQrCode bubbles up unsupported mode errors", () => {
		expect(() =>
			generateQrCode("HELLO", { mode: "kanji" as never }),
		).toThrow(/unsupported mode/i);
	});
});
