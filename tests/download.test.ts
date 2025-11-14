import { describe, expect, test } from "vitest";
import { downloadQrCode } from "../src/download";

const SAMPLE_SVG =
	'<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" fill="#ffffff" /></svg>';

describe("downloadQrCode", () => {
	test("returns SVG blobs and file names without triggering DOM download when disabled", async () => {
		const result = await downloadQrCode(SAMPLE_SVG, {
			fileName: "My QR.svg",
			autoDownload: false,
		});

		expect(result.format).toBe("svg");
		expect(result.fileName).toBe("My_QR.svg");
		expect(result.mimeType).toContain("image/svg+xml");
		await expect(result.blob.text()).resolves.toBe(SAMPLE_SVG);
	});

	test("creates VCard output when payload is provided", async () => {
		const payload = `BEGIN:VCARD
VERSION:4.0
FN:Example Person
TEL;TYPE=work,voice;VALUE=uri:tel:+1-555-555-5555
END:VCARD`;

		const result = await downloadQrCode(SAMPLE_SVG, {
			format: "vcard",
			vcardPayload: payload,
			fileName: "contact",
			autoDownload: false,
		});

		expect(result.fileName).toBe("contact.vcf");
		expect(result.mimeType).toContain("text/vcard");
		await expect(result.blob.text()).resolves.toBe(payload);
	});

	test("throws an explicit error when raster exports are requested without canvas support", async () => {
		await expect(
			downloadQrCode(SAMPLE_SVG, {
				format: "png",
				autoDownload: false,
			}),
		).rejects.toThrow(/canvas/i);
	});
});

