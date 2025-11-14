export type HexColor = `#${string}`;
export type GradientType = "linear" | "radial";

export type ColorSettings = {
	rotation?: number;
	hexColors?: HexColor[];
	gradient?: GradientType;
};

export const DEFAULT_ROTATION: number = 0;
export const DEFAULT_GRADIENT: GradientType = "linear";
export const DEFAULT_BACKGROUND_HEX_COLORS: readonly HexColor[] = ["#ffffff"];
export const DEFAULT_FOREGROUND_HEX_COLORS: readonly HexColor[] = ["#000000"];
export const DEFAULT_BACKGROUND_TRANSPARENCY = false;
export type DotShapeType =
	| Square
	| Dot
	| Rounded
	| ExtraRounded
	| Classy
	| ClassyRounded;
export type CornerSquareShapeType = Square | Dot | Rounded;
export type CornerDotShapeType = Square | Dot;
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
	style?: Square | Dot | Rounded;
};

export type CornerDotStyle = {
	style?: Square | Dot;
};

export interface DotOptions extends ColorSettings, DotStyle {}
export interface CornerSquareOptions extends ColorSettings, CornerSquareStyle {}
export interface CornerDotOptions extends ColorSettings, CornerDotStyle {}
export interface BackgroundOptions extends ColorSettings {
	isTransparent?: boolean;
}
