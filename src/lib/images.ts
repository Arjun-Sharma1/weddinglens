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

// Heuristic thresholds (documented, tunable). The sharpness scale is the
// contrast-normalised Laplacian variance from analyzePixels(). Measured on real
// photographs (not synthetic test patterns): in-focus shots land in the low
// hundreds to a few thousand, while clearly blurred ones fall below ~70. Only
// pathological high-contrast images (e.g. a checkerboard) reach tens of
// thousands, so calibrate against real photos, not those.
const BLUR_THRESHOLD = 120; // normalised laplacian variance below this ≈ blurry
const DARK_LUMA = 50; // mean luma below this ≈ underexposed
const DARK_DIM_LUMA = 80; // dim AND mostly-shadow (e.g. backlit subject) ≈ dark
const SHADOW_LUMA = 40; // a pixel at/below this luma counts as "in shadow"
const SHADOW_FRACTION = 0.75; // share of shadow pixels that reads as "mostly dark"
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

  const { brightness, sharpness, darkFraction } = await analyzePixels(input);

  // Underexposed if the whole frame is dark, or it's dim *and* most of the
  // frame is buried in shadow — catches backlit subjects a mean alone misses.
  const isDark =
    brightness < DARK_LUMA ||
    (brightness < DARK_DIM_LUMA && darkFraction > SHADOW_FRACTION);
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

/**
 * Single-pass pixel analysis on a downscaled greyscale copy:
 *  - brightness:   mean luma (0..255)
 *  - darkFraction: share of pixels buried in shadow (≤ SHADOW_LUMA)
 *  - sharpness:    variance of a signed Laplacian measured on a contrast-
 *                  stretched copy, so the focus measure is exposure-invariant.
 *
 * Two deliberate choices over the naive version:
 *  1. Contrast-stretch luma to its 2nd–98th percentile range before the
 *     Laplacian. A raw Laplacian variance scales with overall contrast, so an
 *     in-focus *dark* photo otherwise scores as low as a blurry one and gets
 *     mis-flagged. Normalising decouples focus from exposure.
 *  2. Compute the Laplacian by hand (signed, float). sharp.convolve() runs on
 *     the 8-bit buffer and clamps the kernel response to [0,255], discarding the
 *     negative edge lobes and corrupting the variance.
 */
async function analyzePixels(input: Buffer): Promise<{
  brightness: number;
  darkFraction: number;
  sharpness: number;
}> {
  const { data, info } = await sharp(input, { failOn: "none" })
    .greyscale()
    .resize(400, 400, { fit: "inside", withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const n = data.length;
  if (n === 0) return { brightness: 0, darkFraction: 1, sharpness: 0 };

  // Pass 1: mean luma, shadow fraction, and a 256-bin histogram for percentiles.
  let sum = 0;
  let shadow = 0;
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) {
    const v = data[i];
    sum += v;
    hist[v]++;
    if (v <= SHADOW_LUMA) shadow++;
  }
  const brightness = sum / n;
  const darkFraction = shadow / n;

  // Robust contrast stretch: map the 2nd/98th luma percentiles to 0..255 so a
  // handful of black/white outliers don't dominate the range.
  const lo = percentile(hist, n, 0.02);
  const hi = percentile(hist, n, 0.98);
  const range = Math.max(hi - lo, 1);
  const norm = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    norm[i] = Math.max(0, Math.min(1, (data[i] - lo) / range)) * 255;
  }

  // Pass 2: variance of the 4-neighbour Laplacian over interior pixels.
  const { width: w, height: h } = info;
  let lsum = 0;
  let lsumSq = 0;
  let ln = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = norm[i - 1] + norm[i + 1] + norm[i - w] + norm[i + w] - 4 * norm[i];
      lsum += lap;
      lsumSq += lap * lap;
      ln++;
    }
  }
  const sharpness = ln ? lsumSq / ln - (lsum / ln) ** 2 : 0;

  return { brightness, darkFraction, sharpness };
}

/** Smallest luma whose cumulative histogram share reaches `p` (0..1). */
function percentile(hist: Uint32Array, total: number, p: number): number {
  const target = total * p;
  let acc = 0;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= target) return v;
  }
  return 255;
}

/** Composite 0..100 quality score weighting sharpness and exposure. */
function compositeQuality(brightness: number, sharpness: number): number {
  // sqrt keeps a usable gradient across the normalised-variance range. Calibrated
  // to real photographs (see BLUR_THRESHOLD): a crisp shot saturates around ~1500,
  // borderline-sharp ones land mid-scale, and anything below BLUR_THRESHOLD scores low.
  const sharpScore = Math.min(1, Math.sqrt(sharpness / 1500));
  const exposureScore = 1 - Math.min(1, Math.abs(brightness - IDEAL_LUMA) / IDEAL_LUMA);
  const score = (0.6 * sharpScore + 0.4 * exposureScore) * 100;
  return Math.round(Math.max(0, Math.min(100, score)));
}
