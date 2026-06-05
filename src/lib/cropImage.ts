// Client-side helper: render a react-easy-crop selection (with rotation) to a
// JPEG blob. Runs in the browser only — no server imports.

type PixelArea = { x: number; y: number; width: number; height: number };

const OUTPUT_QUALITY = 0.9;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.src = src;
  });
}

function radians(deg: number) {
  return (deg * Math.PI) / 180;
}

// Bounding box of an image after rotation, so nothing is clipped.
function rotatedBounds(width: number, height: number, deg: number) {
  const rad = radians(deg);
  return {
    width: Math.abs(Math.cos(rad) * width) + Math.abs(Math.sin(rad) * height),
    height: Math.abs(Math.sin(rad) * width) + Math.abs(Math.cos(rad) * height),
  };
}

/**
 * Produce a cropped (and optionally rotated) JPEG blob from an image source.
 * `pixelCrop` is the croppedAreaPixels reported by react-easy-crop.
 */
export async function getCroppedImg(
  src: string,
  pixelCrop: PixelArea,
  rotation = 0,
): Promise<Blob | null> {
  const image = await loadImage(src);

  // Draw the full image, rotated, onto a canvas sized to its rotated bounds.
  const { width: boxW, height: boxH } = rotatedBounds(
    image.width,
    image.height,
    rotation,
  );
  const rotated = document.createElement("canvas");
  rotated.width = Math.round(boxW);
  rotated.height = Math.round(boxH);
  const rctx = rotated.getContext("2d");
  if (!rctx) return null;
  rctx.translate(boxW / 2, boxH / 2);
  rctx.rotate(radians(rotation));
  rctx.drawImage(image, -image.width / 2, -image.height / 2);

  // Extract the crop region.
  const out = document.createElement("canvas");
  out.width = Math.round(pixelCrop.width);
  out.height = Math.round(pixelCrop.height);
  const octx = out.getContext("2d");
  if (!octx) return null;
  octx.drawImage(
    rotated,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise((resolve) =>
    out.toBlob((blob) => resolve(blob), "image/jpeg", OUTPUT_QUALITY),
  );
}
