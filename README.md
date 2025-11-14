# QR-Code-Generator

> Type-first QR code encoding, matrix masking, SVG rendering, and export utilities for Node 22+ runtimes and modern browsers.

## Table of contents

1. [Features](#features)
2. [Installation](#installation)
3. [Quick start](#quick-start)
4. [Client APIs](#client-apis)
5. [Styling & design types](#styling--design-types)
6. [Exporting & downloading](#exporting--downloading)
7. [Generating & editing workflow](#generating--editing-workflow)
8. [Testing](#testing)
9. [License](#license)

## Features

- Standards-compliant QR encoding with programmable version, error-correction, and mode selection.
- Deterministic matrix construction + masking, exposed for advanced consumers.
- Flexible SVG renderer with gradient-aware styling for dots, finder patterns, and background.
- Browser-friendly download helper that emits SVG, PNG, JPG/JPEG, WebP, or vCard payloads.
- Full TypeScript definitions that describe every option, shape, and exportable type.

## Installation

```bash
npm install
```

> Requires Node.js 22 or newer (`"engines": { "node": ">=22" }`).

## Quick start

```ts
import {
  generateQrCode,
  downloadQrCode,
  type QROptions,
  type SvgRenderOptions,
} from "qr-code-generator";

const dataOptions: QROptions = {
  ecc: "H",
  mode: "byte",
  minVersion: 3,
  maxVersion: 10,
};

const renderOptions: SvgRenderOptions = {
  size: 512,
  margin: 2,
  title: "Contact QR",
  desc: "Scan to download my vCard",
  styling: {
    dotOptions: {
      style: "classyRounded",
      hexColors: ["#0A4FFF", "#6913FF"],
      gradient: "linear",
      rotation: 35,
    },
    cornerSquareOptions: { style: "rounded", hexColors: ["#130C2A"] },
    cornerDotOptions: { style: "square", hexColors: ["#130C2A"] },
    backgroundOptions: { hexColors: ["#FCFBFF"], isTransparent: false },
  },
};

const qr = generateQrCode("https://example.com", dataOptions, renderOptions);

// Mount the SVG anywhere you need it
document.getElementById("qr")!.innerHTML = qr.svg;

// Export a PNG and trigger a download
await downloadQrCode(qr.svg, { format: "png", fileName: "contact-card", size: 1024 });
```

`generateQrCode` returns both the SVG markup and the fully-populated `QrMatrix`, so you can re-render or post-process it however you like.

## Client APIs

### `generateQrCode(input, opts?, renderOptions?)`

Creates the interleaved codewords, builds the matrix, applies mask penalties, and renders SVG output.

Returns a `GenerateQrCodeResult`:

| Field | Type | Description |
| --- | --- | --- |
| `svg` | `string` | Standalone `<svg>` markup sized according to your render options. |
| `styling` | `DesignStyleOptions` | Sanitized styling that the renderer actually applied. |
| `matrix` | `QrMatrix` | `{ size: number; modules: boolean[][] }` grid for low-level access (1 = dark). |
| `version` | `VersionNumber` | Version actually chosen after min/max + capacity checks. |
| `ecc` | `EccLevel` | "L", "M", "Q", "H". |
| `maskId` | `0–7` | Mask pattern index that won the penalty test. |
| `formatBits` | `number` | Final format bits written to the matrix. |

### `QROptions`

| Property | Type | Default | Notes |
| --- | --- | --- | --- |
| `version` | `1–40` | Auto | Force an explicit version. |
| `minVersion` | `1–40` | `1` | Lower bound when letting the encoder pick the smallest fitting version. |
| `maxVersion` | `1–40` | `40` | Upper bound for auto selection. |
| `ecc` | `"L" \| "M" \| "Q" \| "H"` | `"M"` | Higher levels survive more damage but reduce payload capacity. |
| `mode` | `"byte" \| "alphanumeric"` | `"byte"` | Byte mode accepts arbitrary UTF‑8, alphanumeric is faster for restricted data. |

### `SvgRenderOptions`

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `margin` | `number` | `1` module | Quiet-zone thickness in modules. |
| `size` | `number` | Auto (`moduleSize` × modules) | Target pixel width/height; minimum enforced at 32px. |
| `moduleSize` | `number` | `8` | Pixels per module when `size` is omitted. |
| `styling` | `DesignStyleOptions` | See below | Color and shape settings. |
| `title` | `string` | — | `<title>` tag for accessibility. |
| `desc` | `string` | — | `<desc>` tag for accessibility. |
| `shapeRendering` | "auto", "geometricPrecision", "crispEdges", "optimizeSpeed" | `crispEdges`, or `geometricPrecision` when you choose non-square shapes. |

## Styling & design types

All styling primitives live in.

### `ColorSettings`

- `hexColors?: HexColor[]` – At least one `#RRGGBB[AA]` color. Multiple colors become a gradient.
- `gradient?: "linear" | "radial"` – Gradient type when multiple colors exist. Defaults to `"linear"`.
- `rotation?: number` – Degrees for linear gradients. Defaults to `0`.

### Shape types

| Type | Allowed values |
| --- | --- |
| `DotShapeType` | `"square"`, `"dot"`, `"rounded"`, `"extraRounded"`, `"classy"`, `"classyRounded"` |
| `CornerSquareShapeType` | `"square"`, `"dot"`, `"rounded"` |
| `CornerDotShapeType` | `"square"`, `"dot"` |

### `DesignStyleOptions`

```ts
interface DesignStyleOptions {
  backgroundOptions?: BackgroundOptions; // + isTransparent flag
  dotOptions?: DotOptions;               // main data modules
  cornerSquareOptions?: CornerSquareOptions; // finder pattern outer rings
  cornerDotOptions?: CornerDotOptions;       // finder pattern centers
  imageOptions?: ImageOptions;           // centered logo overlay
}
```

Default palette: black dots on white background (`DEFAULT_FOREGROUND_HEX_COLORS`, `DEFAULT_BACKGROUND_HEX_COLORS`). Explicit styles trigger `shapeRendering="geometricPrecision"` so curved shapes stay smooth.

### Image overlay

Add a central logo without breaking scan reliability via `imageOptions`:

```ts
interface ImageOptions {
  source: string;          // data URI, inline SVG, or absolute URL
  altText?: string;
  scale?: number;          // fraction of QR interior (default 0.18)
  pixelSize?: number;      // overrides scale when provided
  safeZoneModules?: number;  // cleared modules around the badge (default 1)
  paddingModules?: number;   // white border thickness (default 0)
  shape?: "square" | "rounded" | "circle"; // default "rounded"
  cornerRadius?: number;   // px radius for rounded squares
  backgroundColor?: HexColor; // defaults to #ffffff unless hideBackground
  hideBackground?: boolean;   // skip drawing the padded backdrop
  opacity?: number;           // 0..1
  preserveAspectRatio?: string; // forwarded to the <image> tag
}
```

The renderer clears the safe-zone modules, draws the optional background shape, clips the image for rounded/circle shapes, and embeds the `<image>` element centered on the QR matrix. Example:

```ts
const { svg } = generateQrCode("https://example.com", undefined, {
  styling: {
    imageOptions: {
      source: "data:image/png;base64,...",
      pixelSize: 128,
      paddingModules: 1,
      shape: "circle",
      altText: "Company mark",
    },
  },
});
```

## Exporting & downloading

`downloadQrCode(svg, options)` converts an SVG string into a browser download.

### `DownloadQrCodeOptions`

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `format` | `"svg", "png", "jpg", "jpeg", "webp", "vcard"` | `"svg"` | Output format; `"jpeg"` aliases to `"jpg"`. |
| `fileName` | `string` | `"qr-code"` | Automatically sanitized; extension appended as needed. |
| `size` | `number` | Derived from SVG | Raster export width/height in pixels. |
| `quality` | `0–1` | Browser default | Applies to JPG/WEBP. PNG ignores it. |
| `vcardPayload` | `string` | — | Required when `format === "vcard"`. |
| `autoDownload` | `boolean` | `true` | Controls whether an `<a download>` click is triggered. |
| `canvas` | `HTMLCanvasElement` | `OffscreenCanvas, Auto-provisioned` | Provide one if you need to reuse a canvas context. |

Returns `{ blob, fileName, mimeType, format }`, so you can upload to a server instead of triggering `autoDownload`.

## Generating & editing workflow

Follow these steps to iterate on a code and its styling:

1. **Install dependencies** – `npm install`.
2. **Render a sample SVG** – `npm run render:svg` invokes `tsx dev/dev.ts` and writes `dev/test.svg` with the default text and styles (`dev/dev.ts:18-63`). Open the file in a browser or vector editor.
3. **Change the payload** – Update the argument to `writeTestSvg` or run `npx tsx dev/dev.ts "Your text"`. You can also import `writeTestSvg` elsewhere.
4. **Tweak the design** – Edit the `DotOptions`, `CornerSquareOptions`, `CornerDotOptions`, and `BackgroundOptions` objects inside `dev/dev.ts` or create new ones in your app. Mix solid fills and gradients by providing multiple `hexColors`.
5. **Control capacity** – Use `QROptions` to lock ECC level or version when calling `generateQrCode`. The returned `version` and `maskId` tell you exactly what the encoder picked.
6. **Preview in your UI** – Inject `result.svg` into the DOM or pass `result.matrix` to a custom renderer.
7. **Export assets** – Call `downloadQrCode` for SVG, PNG, JPG/JPEG, WebP, or vCard outputs. Provide a persistent `canvas` if you export repeatedly to avoid reallocations.
8. **Commit the SVG** – Once satisfied, commit `dev/test.svg` or the generated markup that your product consumes.

### Design recipes

- **Transparent background:** set `backgroundOptions: { isTransparent: true }`.
- **Radial gradient dots:** `dotOptions: { gradient: "radial", hexColors: ["#FF8A00", "#FF3D00"] }`.
- **Classic monochrome:** omit `styling` entirely for a plain black/white QR with `shapeRendering="crispEdges"`.

## Testing

Run the Vitest suite to validate encoders, masks, renderers, and download helpers:

```bash
npm run test
```

To generate SVGs when developing, you can run the following. The results will be saved to `dev/test.svg`
```bash
npm run render:svg
```

## License

[MIT](LICENSE)

The word "QR Code" is registered trademark of DENSO WAVE INCORPORATED
http://www.denso-wave.com/qrcode/faqpatent-e.html
