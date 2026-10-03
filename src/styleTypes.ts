export type HexColor = `#${string}`;
export type GradientType = "linear" | "radial";

export type ColorSettings = {
	rotation?: number;
	hexColors?: HexColor[];
	gradient?: GradientType;
};

export const DEFAULT_ROTATION: number = 0;
export const DEFAULT_GRADIENT: GradientType = "linear";
// Frozen because these arrays are exported and shared with consumers.
export const DEFAULT_BACKGROUND_HEX_COLORS: readonly HexColor[] = Object.freeze([
	"#ffffff",
]);
export const DEFAULT_FOREGROUND_HEX_COLORS: readonly HexColor[] = Object.freeze([
	"#000000",
]);
export const DEFAULT_BACKGROUND_TRANSPARENCY = false;
export const DEFAULT_IMAGE_SCALE = 0.18;
export const DEFAULT_IMAGE_SAFE_ZONE_MODULES = 1;
export const DEFAULT_IMAGE_PADDING_MODULES = 0;
export const DEFAULT_IMAGE_OPACITY = 1;
export type ImageShape = "square" | "rounded" | "circle";
export type QrShape = "square" | "circle";
export const DEFAULT_QR_SHAPE: QrShape = "square";
export const DEFAULT_IMAGE_SHAPE: ImageShape = "rounded";
export type DotShapeType =
	| Square
	| Dot
	| Rounded
	| ExtraRounded
	| Classy
	| ClassyRounded;
export type CornerSquareShapeType =
	| Square
	| Dot
	| Rounded
	| ExtraRounded
	| Classy
	| ClassyRounded;
export type CornerDotShapeType =
	| Square
	| Dot
	| Rounded
	| ExtraRounded
	| Classy
	| ClassyRounded;
export const DEFAULT_DOT_STYLE: DotShapeType = "square";
export const DEFAULT_CORNER_SQUARE_STYLE: CornerSquareShapeType = "square";
export const DEFAULT_CORNER_DOT_STYLE: CornerDotShapeType = "square";

export type Square = "square";
export type Dot = "dot";
export type Rounded = "rounded";
export type ExtraRounded = "extraRounded";
export type Classy = "classy";
export type ClassyRounded = "classyRounded";

export type DotStyle = {
	style?: Square | Dot | Rounded | ExtraRounded | Classy | ClassyRounded;
};

export type CornerSquareStyle = {
	style?: CornerSquareShapeType;
};

export type CornerDotStyle = {
	style?: CornerDotShapeType;
};

export interface DotOptions extends ColorSettings, DotStyle {}
export interface CornerSquareOptions extends ColorSettings, CornerSquareStyle {}
export interface CornerDotOptions extends ColorSettings, CornerDotStyle {}
export interface BackgroundOptions extends ColorSettings {
	isTransparent?: boolean;
}
export interface ImageOptions {
	source?: string;
	altText?: string;
	scale?: number;
	pixelSize?: number;
	safeZoneModules?: number;
	paddingModules?: number;
	shape?: ImageShape;
	cornerRadius?: number;
	backgroundColor?: HexColor;
	opacity?: number;
	/**
	 * Skip the backing plate drawn behind the image. Defaults to false, or
	 * to true when `hideBackgroundDots` is false.
	 */
	hideBackground?: boolean;
	/**
	 * Remove the QR modules covered by the image (plus `safeZoneModules`).
	 * Set to false to keep them visible behind the image, as in
	 * qr-code-styling. Defaults to true.
	 */
	hideBackgroundDots?: boolean;
	preserveAspectRatio?: string;
}
export interface DesignStyleOptions {
	backgroundOptions?: BackgroundOptions;
	dotOptions?: DotOptions;
	cornerSquareOptions?: CornerSquareOptions;
	cornerDotOptions?: CornerDotOptions;
	imageOptions?: ImageOptions;
}
