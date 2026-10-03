import { describe, expect, expectTypeOf, test } from "vitest";
import * as api from "../src";
import { generateQrCode } from "../src";
import type {
	BackgroundOptions,
	Classy,
	ClassyRounded,
	ColorSettings,
	CornerDotOptions,
	CornerDotShapeType,
	CornerDotStyle,
	CornerSquareOptions,
	CornerSquareShapeType,
	CornerSquareStyle,
	DesignStyleOptions,
	Dot,
	DotOptions,
	DotShapeType,
	DotStyle,
	DownloadQrCodeOptions,
	DownloadQrCodeResult,
	EccLevel,
	EncodeMatrixResult,
	ExtraRounded,
	GenerateQrCodeResult,
	GradientType,
	HexColor,
	ImageOptions,
	ImageShape,
	MaskId,
	Matrix,
	MaybeModule,
	Module,
	QrDownloadFormat,
	QRMode,
	QrMatrix,
	QROptions,
	QrShape,
	Rounded,
	SvgRenderOptions,
	Square,
	VersionNumber,
} from "../src";

// Every type reachable from the public API must be importable by consumers.
// This file fails typechecking if any of them stops being exported.
describe("public type exports", () => {
	test("generateQrCode signature is fully described by exported types", () => {
		expectTypeOf(generateQrCode).parameter(1).toEqualTypeOf<
			QROptions | undefined
		>();
		expectTypeOf(generateQrCode).parameter(2).toEqualTypeOf<
			SvgRenderOptions | undefined
		>();
		expectTypeOf(generateQrCode).returns.toEqualTypeOf<GenerateQrCodeResult>();
		expectTypeOf<GenerateQrCodeResult>().toMatchTypeOf<EncodeMatrixResult>();
		expectTypeOf<GenerateQrCodeResult["ecc"]>().toEqualTypeOf<EccLevel>();
		expectTypeOf<GenerateQrCodeResult["version"]>().toEqualTypeOf<VersionNumber>();
		expectTypeOf<GenerateQrCodeResult["maskId"]>().toEqualTypeOf<MaskId>();
		expectTypeOf<GenerateQrCodeResult["matrix"]>().toEqualTypeOf<QrMatrix>();
		expectTypeOf<QrMatrix>().toEqualTypeOf<Matrix>();
		expectTypeOf<Matrix["values"][number][number]>().toEqualTypeOf<MaybeModule>();
		expectTypeOf<MaybeModule>().toEqualTypeOf<Module | null>();
		expectTypeOf<NonNullable<QROptions["mode"]>>().toEqualTypeOf<QRMode>();
		expectTypeOf<NonNullable<SvgRenderOptions["shape"]>>().toEqualTypeOf<QrShape>();
		expectTypeOf<
			NonNullable<SvgRenderOptions["styling"]>
		>().toEqualTypeOf<DesignStyleOptions>();
	});

	test("styling types are exported", () => {
		expectTypeOf<DesignStyleOptions>().toEqualTypeOf<{
			backgroundOptions?: BackgroundOptions;
			dotOptions?: DotOptions;
			cornerSquareOptions?: CornerSquareOptions;
			cornerDotOptions?: CornerDotOptions;
			imageOptions?: ImageOptions;
		}>();
		expectTypeOf<DotOptions>().toMatchTypeOf<ColorSettings & DotStyle>();
		expectTypeOf<CornerSquareOptions>().toMatchTypeOf<CornerSquareStyle>();
		expectTypeOf<CornerDotOptions>().toMatchTypeOf<CornerDotStyle>();
		expectTypeOf<NonNullable<ColorSettings["gradient"]>>().toEqualTypeOf<GradientType>();
		expectTypeOf<NonNullable<ColorSettings["hexColors"]>>().toEqualTypeOf<HexColor[]>();
		expectTypeOf<NonNullable<ImageOptions["shape"]>>().toEqualTypeOf<ImageShape>();
		expectTypeOf<DotShapeType>().toEqualTypeOf<
			Square | Dot | Rounded | ExtraRounded | Classy | ClassyRounded
		>();
		expectTypeOf<CornerSquareShapeType>().toEqualTypeOf<DotShapeType>();
		expectTypeOf<CornerDotShapeType>().toEqualTypeOf<DotShapeType>();
	});

	test("download types are exported", () => {
		expectTypeOf<
			NonNullable<DownloadQrCodeOptions["format"]>
		>().toEqualTypeOf<QrDownloadFormat>();
		expectTypeOf<DownloadQrCodeResult["format"]>().toEqualTypeOf<QrDownloadFormat>();
	});

	test("default values are exported and match what the renderer applies", () => {
		expect(api.DEFAULT_ECC).toBe("M");
		expect(generateQrCode("defaults").ecc).toBe(api.DEFAULT_ECC);

		const { styling } = generateQrCode("defaults");
		expect(styling.dotOptions?.style).toBe(api.DEFAULT_DOT_STYLE);
		expect(styling.cornerSquareOptions?.style).toBe(
			api.DEFAULT_CORNER_SQUARE_STYLE,
		);
		expect(styling.cornerDotOptions?.style).toBe(api.DEFAULT_CORNER_DOT_STYLE);
		expect(styling.dotOptions?.hexColors).toEqual(
			api.DEFAULT_FOREGROUND_HEX_COLORS,
		);
		expect(styling.backgroundOptions?.hexColors).toEqual(
			api.DEFAULT_BACKGROUND_HEX_COLORS,
		);
		expect(styling.backgroundOptions?.isTransparent).toBe(
			api.DEFAULT_BACKGROUND_TRANSPARENCY,
		);

		for (const name of [
			"DEFAULT_GRADIENT",
			"DEFAULT_IMAGE_OPACITY",
			"DEFAULT_IMAGE_PADDING_MODULES",
			"DEFAULT_IMAGE_SAFE_ZONE_MODULES",
			"DEFAULT_IMAGE_SCALE",
			"DEFAULT_IMAGE_SHAPE",
			"DEFAULT_QR_SHAPE",
			"DEFAULT_ROTATION",
		] as const) {
			expect(api[name]).toBeDefined();
		}
	});

	test("shared default color arrays cannot be mutated by consumers", () => {
		expect(Object.isFrozen(api.DEFAULT_FOREGROUND_HEX_COLORS)).toBe(true);
		expect(Object.isFrozen(api.DEFAULT_BACKGROUND_HEX_COLORS)).toBe(true);
	});
});
