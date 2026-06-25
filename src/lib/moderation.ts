import "server-only";
import sharp from "sharp";
import {
  RekognitionClient,
  DetectModerationLabelsCommand,
} from "@aws-sdk/client-rekognition";

/**
 * NSFW screening via AWS Rekognition `DetectModerationLabels`.
 *
 * Deliberately scoped to *explicit sexual* content only. We do NOT flag merely
 * suggestive / non-explicit nudity / swimwear — weddings legitimately produce
 * beach, pool and kissing shots and we don't want false rejections. Violence,
 * gore and drugs are out of scope.
 *
 * Fails OPEN: any missing config, AWS error, or timeout returns
 * `{ ran: false }` so a flaky dependency never blocks a legitimate upload.
 * Manual-mode events still have the organizer as a moderation backstop.
 */

export interface NsfwResult {
  /** False if the check was skipped or unavailable (fail-open). */
  ran: boolean;
  /** True if an explicit-sexual label met/exceeded the confidence threshold. */
  isExplicit: boolean;
  /** Max explicit-category confidence (0..100), or null when `ran` is false. */
  score: number | null;
}

const SKIPPED: NsfwResult = { ran: false, isExplicit: false, score: null };

/** Rekognition top-level moderation categories that count as explicit-sexual. */
const EXPLICIT_TOP_CATEGORIES = new Set(["Explicit Nudity", "Explicit", "Sexual Activity"]);

const REKOGNITION_TIMEOUT_MS = 3000;
const MAX_EDGE = 1024; // longest edge of the JPEG we send to Rekognition

let cachedClient: RekognitionClient | null = null;

function getClient(): RekognitionClient | null {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!region || !accessKeyId || !secretAccessKey) return null;

  cachedClient ??= new RekognitionClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
  return cachedClient;
}

function minConfidence(): number {
  const raw = Number(process.env.NSFW_MIN_CONFIDENCE);
  return Number.isFinite(raw) && raw > 0 ? raw : 80;
}

/**
 * Screen an image for explicit content. Returns `{ ran: false }` on any
 * unavailability or failure (fail-open). Never throws.
 */
export async function screenForNsfw(buffer: Buffer): Promise<NsfwResult> {
  const client = getClient();
  if (!client) return SKIPPED;

  const threshold = minConfidence();

  try {
    // Rekognition's sync API needs JPEG/PNG bytes ≤ 5 MB; our renditions are
    // WebP and originals can be up to 20 MB, so encode a small dedicated JPEG.
    const jpeg = await sharp(buffer, { failOn: "none" })
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    const response = await client.send(
      new DetectModerationLabelsCommand({
        Image: { Bytes: jpeg },
        MinConfidence: threshold,
      }),
      { abortSignal: AbortSignal.timeout(REKOGNITION_TIMEOUT_MS) },
    );

    let maxScore = 0;
    for (const label of response.ModerationLabels ?? []) {
      // The top-level category is the parent name (empty for a top-level label).
      const topCategory = label.ParentName || label.Name || "";
      if (EXPLICIT_TOP_CATEGORIES.has(topCategory)) {
        maxScore = Math.max(maxScore, label.Confidence ?? 0);
      }
    }

    return { ran: true, isExplicit: maxScore >= threshold, score: maxScore };
  } catch (err) {
    // Fail open — log for debuggability, let the photo proceed.
    console.error("[moderation] Rekognition screening failed; failing open.", err);
    return SKIPPED;
  }
}
