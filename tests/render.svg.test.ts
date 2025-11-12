import { describe, expect, test } from "vitest";
import { renderSvg } from "../src";
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
	test("renders default SVG output with aggregated path segments", () => {
		const matrix = buildMatrix([
			[1, 1, 0],
			[0, 1, 1],
			[0, 0, 1],
		]);

		const svg = renderSvg(matrix);

		expect(svg).toContain('viewBox="0 0 11 11"');
		expect(svg).toContain('width="88"');
		expect(svg).toContain('height="88"');
		expect(svg).toContain('<rect width="11" height="11" fill="#ffffff" />');
		expect(svg).toContain(
			'<path d="M4 4h2v1h-2zM5 5h2v1h-2zM6 6h1v1h-1z" fill="#000000" />',
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
			darkColor: "#112233",
			lightColor: "transparent",
			title: 'Say "hi" & <friends>',
			desc: "Less > more",
			shapeRendering: "geometricPrecision",
		});

		expect(svg).toContain('shape-rendering="geometricPrecision"');
		expect(svg).toContain('<title>Say &quot;hi&quot; &amp; &lt;friends&gt;</title>');
		expect(svg).toContain("<desc>Less &gt; more</desc>");
		expect(svg).toContain('<rect width="4" height="4" fill="transparent" />');
		expect(svg).toContain(
			'<path d="M1 1h1v1h-1zM1 2h2v1h-2z" fill="#112233" />',
		);
		expect(svg).toContain('width="8"');
		expect(svg).toContain('height="8"');
	});

	test("falls back to backgroundColor and omits paths when no dark modules are set", () => {
		const matrix = makeMatrix(1);

		const svg = renderSvg(matrix, {
			margin: 0,
			moduleSize: 5,
			backgroundColor: "#eeeeee",
		});

		expect(svg).toContain('<rect width="1" height="1" fill="#eeeeee" />');
		expect(svg).toContain('width="5"');
		expect(svg).toContain('height="5"');
		expect(svg).not.toContain("<path");
	});

	test("clamps negative margins and resets invalid module sizes to defaults", () => {
		const matrix = buildMatrix([[1]]);

		const svg = renderSvg(matrix, {
			margin: -5,
			moduleSize: Number.NaN,
		});

		expect(svg).toContain('viewBox="0 0 1 1"');
		expect(svg).toContain('width="8"');
		expect(svg).toContain('height="8"');
		expect(svg).toContain('<path d="M0 0h1v1h-1z" fill="#000000" />');
	});
});
