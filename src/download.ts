const DEFAULT_EXPORT_SIZE = 512;
const DEFAULT_FILE_NAME = "qr-code";

export type QrDownloadFormat =
	| "svg"
	| "png"
	| "jpg"
	| "jpeg"
	| "webp"
	| "vcard";

export interface DownloadQrCodeOptions {
	format?: QrDownloadFormat;
	fileName?: string;
	size?: number;
	quality?: number;
	vcardPayload?: string;
	autoDownload?: boolean;
	canvas?: HTMLCanvasElement | OffscreenCanvas;
}

export interface DownloadQrCodeResult {
	blob: Blob;
	fileName: string;
	mimeType: string;
	format: QrDownloadFormat;
}

type FormatDescriptor = {
	extension: string;
	mimeType: string;
	kind: "vector" | "raster" | "text";
};

const FORMAT_DESCRIPTOR: Record<QrDownloadFormat, FormatDescriptor> = {
	svg: {
		extension: "svg",
		mimeType: "image/svg+xml;charset=utf-8",
		kind: "vector",
	},
	png: { extension: "png", mimeType: "image/png", kind: "raster" },
	jpg: { extension: "jpg", mimeType: "image/jpeg", kind: "raster" },
	jpeg: { extension: "jpg", mimeType: "image/jpeg", kind: "raster" },
	webp: { extension: "webp", mimeType: "image/webp", kind: "raster" },
	vcard: {
		extension: "vcf",
		mimeType: "text/vcard;charset=utf-8",
		kind: "text",
	},
};

type UrlWithObjectUrl = typeof URL & {
	createObjectURL?: (obj: Blob | MediaSource) => string;
	revokeObjectURL?: (obj: string) => void;
};

const getUrlApi = (): UrlWithObjectUrl | undefined => {
	if (typeof URL === "undefined") return undefined;
	return URL as UrlWithObjectUrl;
};

const sanitizeFileName = (
	fileName: string | undefined,
	extension: string,
): string => {
	const base = fileName?.trim() ?? DEFAULT_FILE_NAME;
	const normalized = base
		.replace(/[^a-z0-9_\-.]+/gi, "_")
		.replace(/\.+$/, "");
	const ensured = normalized.length > 0 ? normalized : DEFAULT_FILE_NAME;
	const lower = ensured.toLowerCase();
	const suffix = `.${extension}`;
	if (lower.endsWith(suffix)) return ensured;
	return `${ensured}${suffix}`;
};

const sanitizeDimension = (value: number | undefined): number | undefined => {
	if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
		return undefined;
	}
	return Math.floor(value);
};

const parseNumericAttribute = (
	svgTag: string,
	attr: string,
): number | undefined => {
	const match = svgTag.match(new RegExp(`${attr}\\s*=\\s*"([^"]+)"`, "i"));
	if (!match) return undefined;
	const numeric = Number.parseFloat(match[1] ?? "");
	return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
};

const parseViewBoxDimensions = (
	svgTag: string,
): { width: number; height: number } | undefined => {
	const match = svgTag.match(/viewBox\s*=\s*"([^"]+)"/i);
	if (!match) return undefined;
	const parts = match[1]?.trim().split(/\s+/) ?? [];
	if (parts.length !== 4) return undefined;
	const width = Number.parseFloat(parts[2] ?? "");
	const height = Number.parseFloat(parts[3] ?? "");
	if (!Number.isFinite(width) || !Number.isFinite(height)) return undefined;
	if (width <= 0 || height <= 0) return undefined;
	return { width, height };
};

const extractSvgTag = (svgMarkup: string): string => {
	const match = svgMarkup.match(/<svg\b[^>]*>/i);
	return match?.[0] ?? "";
};

const resolveSvgDimensions = (
	svgMarkup: string,
	requestedSize?: number,
): { width: number; height: number } => {
	const svgTag = extractSvgTag(svgMarkup);
	const widthAttr = parseNumericAttribute(svgTag, "width");
	const heightAttr = parseNumericAttribute(svgTag, "height");
	const viewBox = parseViewBoxDimensions(svgTag);

	const sanitizedSize = sanitizeDimension(requestedSize);

	const width =
		sanitizedSize ??
		widthAttr ??
		viewBox?.width ??
		heightAttr ??
		viewBox?.height ??
		DEFAULT_EXPORT_SIZE;

	const height = sanitizedSize ?? heightAttr ?? viewBox?.height ?? width;

	return { width, height };
};

const clampQuality = (value: number | undefined): number | undefined => {
	if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
	if (value <= 0) return 0;
	if (value >= 1) return 1;
	return value;
};

type CanvasLike = HTMLCanvasElement | OffscreenCanvas;

const ensureRasterizationSupport = (canvas?: CanvasLike): void => {
	if (canvas) return;
	const hasOffscreen =
		typeof OffscreenCanvas !== "undefined" &&
		typeof createImageBitmap === "function";
	const hasDomCanvas =
		typeof document !== "undefined" &&
		typeof document.createElement === "function" &&
		typeof Image !== "undefined";
	if (!hasOffscreen && !hasDomCanvas) {
		throw new Error(
			"Raster format exports require Canvas APIs. Provide a canvas instance or run inside a browser-like environment.",
		);
	}
};

const prepareCanvas = (
	canvas: CanvasLike | undefined,
	width: number,
	height: number,
): CanvasLike => {
	if (canvas) {
		canvas.width = width;
		canvas.height = height;
		return canvas;
	}
	if (typeof OffscreenCanvas !== "undefined") {
		return new OffscreenCanvas(width, height);
	}
	if (
		typeof document !== "undefined" &&
		typeof document.createElement === "function"
	) {
		const element = document.createElement("canvas");
		element.width = width;
		element.height = height;
		return element;
	}
	throw new Error("Canvas APIs are unavailable in the current environment.");
};

type CanvasImage = CanvasImageSource & {
	close?: () => void;
};

const loadSvgAsImage = async (svgMarkup: string): Promise<CanvasImage> => {
	const svgBlob = new Blob([svgMarkup], {
		type: FORMAT_DESCRIPTOR.svg.mimeType,
	});
	if (typeof createImageBitmap === "function") {
		return await createImageBitmap(svgBlob);
	}
	if (typeof Image === "undefined") {
		throw new Error("Image constructor is unavailable for rasterization.");
	}
	const urlApi = getUrlApi();
	const objectUrl = urlApi?.createObjectURL?.(svgBlob);
	try {
		const src =
			objectUrl ??
			(await new Promise<string>((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => resolve(String(reader.result));
				reader.onerror = () =>
					reject(new Error("Unable to read SVG for rasterization."));
				reader.readAsDataURL(svgBlob);
			}));

		return await new Promise((resolve, reject) => {
			const image = new Image();
			image.decoding = "async";
			image.onload = () => resolve(image);
			image.onerror = () =>
				reject(
					new Error("Failed to decode SVG while preparing download."),
				);
			image.src = src;
		});
	} finally {
		if (objectUrl && typeof urlApi?.revokeObjectURL === "function") {
			urlApi.revokeObjectURL(objectUrl);
		}
	}
};

const canvasToBlob = async (
	canvas: CanvasLike,
	mimeType: string,
	quality?: number,
): Promise<Blob> => {
	if (
		"convertToBlob" in canvas &&
		typeof canvas.convertToBlob === "function"
	) {
		return await canvas.convertToBlob({ type: mimeType, quality });
	}
	return await new Promise<Blob>((resolve, reject) => {
		const element = canvas as HTMLCanvasElement;
		if (typeof element.toBlob !== "function") {
			reject(
				new Error("Canvas toBlob is unavailable for raster downloads."),
			);
			return;
		}
		element.toBlob(
			(blob) => {
				if (!blob) {
					reject(
						new Error("Canvas failed to produce binary output."),
					);
					return;
				}
				resolve(blob);
			},
			mimeType,
			quality,
		);
	});
};

const rasterizeSvg = async (
	svgMarkup: string,
	mimeType: string,
	width: number,
	height: number,
	quality: number | undefined,
	canvas?: CanvasLike,
): Promise<Blob> => {
	ensureRasterizationSupport(canvas);
	const workingCanvas = prepareCanvas(canvas, width, height);
	const context = workingCanvas.getContext("2d");
	if (!context) {
		throw new Error(
			"Unable to acquire a 2D canvas context for raster export.",
		);
	}
	const image = await loadSvgAsImage(svgMarkup);
	context.clearRect(0, 0, width, height);
	context.drawImage(image, 0, 0, width, height);
	image.close?.();
	return await canvasToBlob(workingCanvas, mimeType, quality);
};

const maybeTriggerDomDownload = (
	blob: Blob,
	fileName: string,
	enabled: boolean,
): void => {
	if (!enabled) return;
	if (
		typeof document === "undefined" ||
		typeof document.createElement !== "function"
	) {
		return;
	}
	const urlApi = getUrlApi();
	if (typeof urlApi?.createObjectURL !== "function") return;
	const href = urlApi.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = href;
	anchor.download = fileName;
	anchor.rel = "noopener";
	anchor.style.display = "none";
	(document.body ?? document.documentElement)?.appendChild(anchor);
	anchor.click();
	anchor.remove();
	if (typeof urlApi.revokeObjectURL === "function") {
		urlApi.revokeObjectURL(href);
	}
};

const normalizeFormat = (
	format: QrDownloadFormat | undefined,
): QrDownloadFormat => {
	if (!format) return "svg";
	return format === "jpeg" ? "jpg" : format;
};

const createSvgBlob = (svgMarkup: string): Blob =>
	new Blob([svgMarkup], { type: FORMAT_DESCRIPTOR.svg.mimeType });

const createVcardBlob = (payload: string | undefined): Blob => {
	if (typeof payload !== "string" || payload.trim().length === 0) {
		throw new Error("A vCard payload is required to export a VCard file.");
	}
	return new Blob([payload], { type: FORMAT_DESCRIPTOR.vcard.mimeType });
};

export const downloadQrCode = async (
	svgMarkup: string,
	options: DownloadQrCodeOptions = {},
): Promise<DownloadQrCodeResult> => {
	if (typeof svgMarkup !== "string" || svgMarkup.length === 0) {
		throw new Error(
			"A non-empty SVG string is required to download a QR code.",
		);
	}
	const normalizedFormat = normalizeFormat(options.format);
	const descriptor = FORMAT_DESCRIPTOR[normalizedFormat];
	const fileName = sanitizeFileName(options.fileName, descriptor.extension);
	let blob: Blob;
	if (descriptor.kind === "vector") {
		blob = createSvgBlob(svgMarkup);
	} else if (descriptor.kind === "text") {
		blob = createVcardBlob(options.vcardPayload);
	} else {
		const { width, height } = resolveSvgDimensions(svgMarkup, options.size);
		const quality =
			normalizedFormat === "png"
				? undefined
				: clampQuality(options.quality);
		blob = await rasterizeSvg(
			svgMarkup,
			descriptor.mimeType,
			width,
			height,
			quality,
			options.canvas,
		);
	}

	const result: DownloadQrCodeResult = {
		blob,
		fileName,
		mimeType: descriptor.mimeType,
		format: normalizedFormat,
	};
	const autoDownloadEnabled = options.autoDownload ?? true;
	maybeTriggerDomDownload(blob, fileName, autoDownloadEnabled);
	return result;
};

