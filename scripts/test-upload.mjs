// E2E upload tester: generates images with sharp and posts them through the
// real /api/events/[slug]/photos route. Usage: node scripts/test-upload.mjs
import sharp from "sharp";

const SLUG = process.env.SLUG ?? "arjun-and-priya";
const BASE = process.env.BASE ?? "http://localhost:3000";

async function makeImage(seed, { dark = false } = {}) {
  // A colorful gradient + noise so brightness/sharpness are non-trivial.
  const w = 1200, h = 800;
  const r = (seed * 53) % 255;
  const g = (seed * 97) % 255;
  const b = (seed * 131) % 255;
  const base = sharp({
    create: { width: w, height: h, channels: 3, background: { r, g, b } },
  });
  // overlay noise text-ish blocks via composite of random rects
  const svg = `<svg width="${w}" height="${h}">
    <rect width="100%" height="100%" fill="rgb(${r},${g},${b})"/>
    <circle cx="${300 + seed * 20}" cy="400" r="220" fill="rgb(${(r+90)%255},${(g+40)%255},${(b+120)%255})"/>
    <rect x="${500 + seed*10}" y="200" width="380" height="380" fill="rgb(${(r+150)%255},${(g+200)%255},${(b+60)%255})"/>
    <text x="80" y="120" font-size="90" fill="white">Moment #${seed}</text>
  </svg>`;
  let img = base.composite([{ input: Buffer.from(svg) }]);
  if (dark) img = img.modulate({ brightness: 0.15 });
  return img.jpeg({ quality: 90 }).toBuffer();
}

async function upload(buf, label) {
  const form = new FormData();
  form.append("photo", new Blob([buf], { type: "image/jpeg" }), `${label}.jpg`);
  const res = await fetch(`${BASE}/api/events/${SLUG}/photos`, {
    method: "POST",
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  console.log(`[${label}] HTTP ${res.status}`, JSON.stringify(json));
  return json;
}

const a = await makeImage(1);
const b = await makeImage(2);
const c = await makeImage(3, { dark: true });

await upload(a, "photo-1");
await upload(b, "photo-2");
await upload(c, "photo-3-dark");
// Re-upload the first byte-for-byte to test duplicate detection.
await upload(a, "photo-1-dup");

console.log("done");
