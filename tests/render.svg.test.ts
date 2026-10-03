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

		const { svg } = renderSvg(matrix);

		// Default 4-module quiet zone: (3 + 4*2) modules * 8px = 88px, and the
		// first dark module sits at offset 4*8 = 32px.
		expect(svg).toContain('viewBox="0 0 88 88"');
		expect(svg).toContain('width="88"');
		expect(svg).toContain('height="88"');
		expect(svg).toContain('<rect width="88" height="88" fill="#ffffff" />');
		expect(svg).toContain("M 32 32 h 8 v 8 h -8 Z");
		expect(svg).toMatch(/<path d="[^"]+" fill="#000000"/);
	});

	test("supports custom sizing, metadata, and colors", () => {
		const matrix = buildMatrix([
			[1, 0],
			[1, 1],
		]);

		const { svg } = renderSvg(matrix, {
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

		const { svg } = renderSvg(matrix, {
			margin: 0,
			moduleSize: 5,
		});

		expect(svg).toContain('<rect width="5" height="5" fill="#ffffff" />');
		expect(svg).toContain('width="5"');
		expect(svg).toContain('height="5"');
		expect(svg).not.toContain("<path");
	});

	test("clamps negative margins and resets invalid module sizes to defaults", () => {
		const matrix = buildMatrix([[1]]);

		const { svg } = renderSvg(matrix, {
			margin: -5,
			moduleSize: Number.NaN,
		});

		expect(svg).toContain('viewBox="0 0 8 8"');
		expect(svg).toContain('width="8"');
		expect(svg).toContain('height="8"');
		expect(svg).toContain("M 0 0 h 8 v 8 h -8 Z");
	});

	test("respects explicit size by deriving module dimensions", () => {
		const matrix = buildMatrix([
			[1, 0],
			[1, 1],
		]);

		const { svg } = renderSvg(matrix, {
			margin: 1,
			size: 200,
		});

		expect(svg).toContain('viewBox="0 0 200 200"');
		expect(svg).toContain('width="200"');
		expect(svg).toContain('height="200"');
		expect(svg).toContain("M 50 50 h 50 v 50 h -50 Z");
	});

	test("allows direct styling fields on SvgRenderOptions", () => {
		const matrix = buildMatrix([
			[1, 0],
			[1, 1],
		]);

		const { svg, styling } = renderSvg(matrix, {
			styling: {
				dotOptions: { style: "dot" },
			},
		});

		expect(svg).toContain('shape-rendering="geometricPrecision"');
		expect(styling.dotOptions?.style).toBe("dot");
	});

	test("renders a centered image overlay and removes modules inside the safe zone", () => {
		const matrix = buildMatrix([
			[1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1],
		]);

		const { svg } = renderSvg(matrix, {
			margin: 0,
			moduleSize: 10,
			styling: {
				imageOptions: {
					source: "data:image/png;base64,AAA",
					scale: 0.3,
					safeZoneModules: 1,
					paddingModules: 0.5,
					shape: "rounded",
				},
			},
		});

		expect(svg).toContain('<image ');
		expect(svg).toContain('href="data:image/png;base64,AAA"');
		// center module at (20,20) should be cleared
		expect(svg).not.toContain("M 20 20 h 10 v 10 h -10 Z");
		// background rectangle should be present for the overlay
		expect(svg).toMatch(
			/<rect x="12\.5" y="12\.5" width="25" height="25"[^>]+fill="#ffffff"/,
		);
	});

	test("exposes sanitized image options in the styling payload", () => {
		const matrix = buildMatrix([
			[1, 0, 1],
			[1, 1, 0],
			[0, 1, 1],
		]);

		const { styling } = renderSvg(matrix, {
			styling: {
				imageOptions: {
					source: "logo.svg",
					scale: 0.5,
					paddingModules: 2,
					safeZoneModules: 3,
					shape: "square",
					hideBackground: true,
					opacity: 0.8,
					preserveAspectRatio: "none",
				},
			},
		});

		expect(styling.imageOptions?.scale).toBeGreaterThan(0);
		expect(styling.imageOptions?.paddingModules).toBe(2);
		expect(styling.imageOptions?.safeZoneModules).toBe(3);
		expect(styling.imageOptions?.shape).toBe("square");
		expect(styling.imageOptions?.opacity).toBe(0.8);
		expect(styling.imageOptions?.preserveAspectRatio).toBe("none");
	});

	test("respects alt text and preserveAspectRatio for images", () => {
		const matrix = buildMatrix([
			[1, 1, 1],
			[1, 1, 1],
			[1, 1, 1],
		]);

		const { svg } = renderSvg(matrix, {
			styling: {
				imageOptions: {
					source: "logo.png",
					altText: "Company mark",
					preserveAspectRatio: "xMidYMid slice",
					shape: "circle",
				},
			},
		});

		expect(svg).toContain('aria-label="Company mark"');
		expect(svg).toContain('preserveAspectRatio="xMidYMid slice"');
		expect(svg).toMatch(/clip-path="url\(#image-clip-[^)]+\)"/);
	});

	test("merges each module group into a single path", () => {
		const { svg } = renderSvg(buildFinderMatrix(), {
			margin: 0,
			moduleSize: 10,
		});

		// dots, corner squares and corner dots
		expect(svg.match(/<path /g)).toHaveLength(3);
		expect(svg).not.toMatch(/<rect x="/);
	});

	test("rounds data modules based on their neighbors", () => {
		const matrix = makeMatrix(21);
		setModule(matrix, 10, 10, 1); // isolated
		setModule(matrix, 12, 10, 1); // horizontal pair
		setModule(matrix, 12, 11, 1);

		const { svg } = renderSvg(matrix, {
			margin: 0,
			moduleSize: 10,
			styling: { dotOptions: { style: "rounded" } },
		});

		// Isolated module becomes a full circle.
		expect(svg).toContain(
			"M 100 105 A 5 5 0 1 0 110 105 A 5 5 0 1 0 100 105 Z",
		);
		// Pair ends become half pills: left end rounded on its left side,
		// right end rounded on its right side.
		expect(svg).toContain("L 105 120 A 5 5 0 0 0 105 130 Z");
		expect(svg).toContain("L 115 130 A 5 5 0 0 0 115 120 Z");
	});

	test("draws dot finder patterns as a single ring and circle", () => {
		const { svg, styling } = renderSvg(buildFinderMatrix(), {
			margin: 0,
			moduleSize: 10,
			styling: {
				cornerSquareOptions: { style: "dot", hexColors: ["#111111"] },
				cornerDotOptions: { style: "dot", hexColors: ["#222222"] },
			},
		});

		// Outer ring: 35px outer radius with a 25px hole, cut by evenodd.
		expect(svg).toMatch(
			/<path d="M 0 35 A 35 35 0 1 0 70 35 [^"]*M 10 35 A 25 25 [^"]*" fill="#111111" fill-rule="evenodd"/,
		);
		// Center: one 15px-radius circle over the 3x3 block.
		expect(svg).toMatch(
			/<path d="M 20 35 A 15 15 0 1 0 50 35 [^"]*" fill="#222222"/,
		);
		expect(styling.cornerSquareOptions?.style).toBe("dot");
		expect(styling.cornerDotOptions?.style).toBe("dot");
	});

	test("draws extraRounded finder rings as a single rounded shape", () => {
		const { svg } = renderSvg(buildFinderMatrix(), {
			margin: 0,
			moduleSize: 10,
			styling: { cornerSquareOptions: { style: "extraRounded" } },
		});

		expect(svg).toContain("M 0 25 v 20 a 25 25 0 0 0 25 25");
		expect(svg).toContain("M 25 10 h 20 a 15 15 0 0 1 15 15");
	});

	test("accepts dot shapes for finder patterns and falls back on unknown styles", () => {
		const { styling } = renderSvg(buildFinderMatrix(), {
			styling: {
				cornerSquareOptions: { style: "classy" },
				cornerDotOptions: {
					style: "bogus" as unknown as "square",
				},
			},
		});

		expect(styling.cornerSquareOptions?.style).toBe("classy");
		expect(styling.cornerDotOptions?.style).toBe("square");
	});
});

// 21x21 matrix containing only the three finder patterns.
const buildFinderMatrix = () => {
	const matrix = makeMatrix(21);
	for (const [row, col] of [
		[0, 0],
		[0, 14],
		[14, 0],
	]) {
		for (let r = 0; r < 7; r++) {
			for (let c = 0; c < 7; c++) {
				const ring = r === 0 || r === 6 || c === 0 || c === 6;
				const center = r >= 2 && r <= 4 && c >= 2 && c <= 4;
				setModule(matrix, row + r, col + c, ring || center ? 1 : 0);
			}
		}
	}
	setModule(matrix, 10, 10, 1);
	return matrix;
};
