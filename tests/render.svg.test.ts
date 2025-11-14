import { describe, expect, test } from "vitest";
import { renderSvg } from "../src/render/svg";
import { makeMatrix, setModule } from "../src/matrix/types";

const buildMatrix = (rows: (0 | 1)[][]) => {
	const size = rows.length;
	const matrix = makeMatrix(size);
	for (let r = 0; r < size; r++) {
		for (let c = 0; c < size; c++) {
			setModule(matrix, r, c, rows[r][c]);
		}
	}
	return matrix;
};

describe("renderSvg", () => {
	test("renders default SVG output with absolute pixel sizing", () => {
		const matrix = buildMatrix([
			[1, 1, 0],
			[0, 1, 1],
			[0, 0, 1],
		]);

		const svg = renderSvg(matrix);

		expect(svg).toContain('viewBox="0 0 88 88"');
		expect(svg).toContain('width="88"');
		expect(svg).toContain('height="88"');
		expect(svg).toContain('<rect width="88" height="88" fill="#ffffff" />');
		expect(svg).toMatch(
			/<rect x="32" y="32" width="8" height="8" fill="#000000" \/>/,
		);
	});

	test("supports custom sizing, metadata, and colors", () => {
		const matrix = buildMatrix([
			[1, 0],
			[1, 1],
		]);

		const svg = renderSvg(matrix, {
			margin: 1,
			moduleSize: 2,
			title: 'Say "hi" & <friends>',
			desc: "Less > more",
			shapeRendering: "geometricPrecision",
		});

		expect(svg).toContain('shape-rendering="geometricPrecision"');
		expect(svg).toContain(
			"<title>Say &quot;hi&quot; &amp; &lt;friends&gt;</title>",
		);
		expect(svg).toContain("<desc>Less &gt; more</desc>");

		expect(svg).toContain('viewBox="0 0 8 8"');
	});

	test("falls back to backgroundColor and omits module rects when no dark modules are set", () => {
		const matrix = makeMatrix(1);

		const svg = renderSvg(matrix, {
			margin: 0,
			moduleSize: 5,
		});

		expect(svg).toContain('<rect width="5" height="5" fill="#ffffff" />');
		expect(svg).toContain('width="5"');
		expect(svg).toContain('height="5"');
		expect(svg).not.toMatch(/<rect x="/);
	});

	test("clamps negative margins and resets invalid module sizes to defaults", () => {
		const matrix = buildMatrix([[1]]);

		const svg = renderSvg(matrix, {
			margin: -5,
			moduleSize: Number.NaN,
		});

		expect(svg).toContain('viewBox="0 0 8 8"');
		expect(svg).toContain('width="8"');
		expect(svg).toContain('height="8"');
		expect(svg).toMatch(
			/<rect x="0" y="0" width="8" height="8" fill="#000000" \/>/,
		);
	});
});
