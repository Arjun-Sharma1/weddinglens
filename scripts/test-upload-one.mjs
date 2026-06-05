// Upload a single unique image. Usage: node scripts/test-upload-one.mjs <seed>
import sharp from "sharp";

const SLUG = process.env.SLUG ?? "arjun-and-priya";
const BASE = process.env.BASE ?? "http://localhost:3000";
const seed = Number(process.argv[2] ?? "42");

const w = 1200, h = 800;
const r = (seed * 71) % 255, g = (seed * 113) % 255, b = (seed * 169) % 255;
const svg = `<svg width="${w}" height="${h}">
  <rect width="100%" height="100%" fill="rgb(${r},${g},${b})"/>
  <circle cx="600" cy="400" r="260" fill="rgb(${(r+120)%255},${(g+60)%255},${(b+30)%255})"/>
  <text x="80" y="140" font-size="96" fill="white">Live ${seed}</text>
</svg>`;
const buf = await sharp({
  create: { width: w, height: h, channels: 3, background: { r, g, b } },
})
  .composite([{ input: Buffer.from(svg) }])
  .jpeg({ quality: 90 })
  .toBuffer();

const form = new FormData();
form.append("photo", new Blob([buf], { type: "image/jpeg" }), `live-${seed}.jpg`);
const res = await fetch(`${BASE}/api/events/${SLUG}/photos`, { method: "POST", body: form });
console.log(`HTTP ${res.status}`, await res.text());
