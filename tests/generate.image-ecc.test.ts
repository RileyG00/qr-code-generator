import { describe, expect, test } from "vitest";
import { generateQrCode } from "../src";

const sampleText = "Image ECC enforcement test";

describe("generateQrCode image ECC overrides", () => {
	test("does not adjust ecc when no image is present", () => {
		const result = generateQrCode(sampleText, { ecc: "L" });
		expect(result.ecc).toBe("L");
	});

	test("bumps ecc to Q when an image is provided", () => {
		const result = generateQrCode(
			sampleText,
			{ ecc: "L" },
			{
				styling: {
					imageOptions: {
						source: "data:image/png;base64,AAA",
						scale: 0.2,
					},
				},
			},
		);
		expect(result.ecc).toBe("Q");
	});

	test("bumps ecc to H when an image scale is >= 0.25", () => {
		const result = generateQrCode(
			sampleText,
			{ ecc: "L" },
			{
				styling: {
					imageOptions: {
						source: "logo.png",
						scale: 0.3,
					},
				},
			},
		);
		expect(result.ecc).toBe("H");
	});
});
