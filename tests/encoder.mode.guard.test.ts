import { describe, expect, test } from "vitest";
import { encodeToMatrix, prepareCodewords } from "../src";

describe("encoder mode guards", () => {
	test("prepareCodewords rejects unsupported modes", () => {
		expect(() =>
			prepareCodewords("HELLO", { mode: "numeric" as never }),
		).toThrow(/unsupported mode/i);
	});

	test("encodeToMatrix bubbles up unsupported mode errors", () => {
		expect(() =>
			encodeToMatrix("HELLO", { mode: "kanji" as never }),
		).toThrow(/unsupported mode/i);
	});
});
