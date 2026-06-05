import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";

export interface Rendition {
  key: "original" | "thumb" | "medium" | "display";
  buffer: Buffer;
  ext: string;
  contentType: string;
}

export interface ProcessedImage {
  hash: string;
  width: number;
  height: number;
  brightness: number; // 0..255 luma mean
  sharpness: number; // laplacian variance proxy
  qualityScore: number; // 0..100 composite
  isBlurry: boolean;
  isDark: boolean;
  renditions: Rendition[];
}

// Rendition target widths (longest edge), no upscaling.
const SIZES = { thumb: 320, medium: 1080, display: 1920 } as const;

// Heuristic thresholds (documented, tunable).
const BLUR_THRESHOLD = 90; // laplacian variance below this ≈ soft/blurry
const DARK_LUMA = 48; // mean luma below this ≈ underexposed
const IDEAL_LUMA = 135; // sweet spot for exposure scoring

export function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Full upload pipeline: auto-orient, hash, measure quality, and produce
 * thumb/medium/display WebP renditions plus the (re-encoded) original.
 */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  const hash = sha256(input);

  // Auto-orient via EXIF so all derived renditions are upright.
  const base = sharp(input, { failOn: "none" }).rotate();
  const meta = await base.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  const [brightness, sharpness] = await Promise.all([
    measureBrightness(input),
    measureSharpness(input),
  ]);

  const isDark = brightness < DARK_LUMA;
  const isBlurry = sharpness < BLUR_THRESHOLD;
  const qualityScore = compositeQuality(brightness, sharpness);

  // Original is normalized to an upright JPEG at full quality for archival
  // (download package) without leaking EXIF/location metadata.
  const original = await sharp(input, { failOn: "none" })
    .rotate()
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();

  const [thumb, medium, display] = await Promise.all([
    encodeWebp(input, SIZES.thumb, 70),
    encodeWebp(input, SIZES.medium, 80),
    encodeWebp(input, SIZES.display, 82),
  ]);

  return {
    hash,
    width,
    height,
    brightness,
    sharpness,
    qualityScore,
    isBlurry,
    isDark,
    renditions: [
      { key: "original", buffer: original, ext: "jpg", contentType: "image/jpeg" },
      { key: "thumb", buffer: thumb, ext: "webp", contentType: "image/webp" },
      { key: "medium", buffer: medium, ext: "webp", contentType: "image/webp" },
      { key: "display", buffer: display, ext: "webp", contentType: "image/webp" },
    ],
  };
}

async function encodeWebp(input: Buffer, width: number, quality: number) {
  return sharp(input, { failOn: "none" })
    .rotate()
    .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();
}

/** Mean luma (0..255) from per-channel means. */
async function measureBrightness(input: Buffer): Promise<number> {
  const stats = await sharp(input, { failOn: "none" }).stats();
  const [r, g, b] = stats.channels;
  if (!r) return 0;
  if (!g || !b) return r.mean; // greyscale source
  return 0.299 * r.mean + 0.587 * g.mean + 0.114 * b.mean;
}

/**
 * Sharpness via Laplacian variance: convolve a downscaled greyscale copy with
 * a Laplacian kernel and take the variance of the response. Higher = sharper.
 */
async function measureSharpness(input: Buffer): Promise<number> {
  const { data } = await sharp(input, { failOn: "none" })
    .greyscale()
    .resize(400, 400, { fit: "inside", withoutEnlargement: true })
    .convolve({ width: 3, height: 3, kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0] })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
    sumSq += data[i] * data[i];
  }
  const n = data.length || 1;
  const mean = sum / n;
  return sumSq / n - mean * mean; // variance
}

/** Composite 0..100 quality score weighting sharpness and exposure. */
function compositeQuality(brightness: number, sharpness: number): number {
  const sharpScore = Math.min(1, sharpness / 400);
  const exposureScore = 1 - Math.min(1, Math.abs(brightness - IDEAL_LUMA) / IDEAL_LUMA);
  const score = (0.6 * sharpScore + 0.4 * exposureScore) * 100;
  return Math.round(Math.max(0, Math.min(100, score)));
}
