// Verify the EXIF live-photo gate: build a JPEG stamped with an old
// DateTimeOriginal, confirm exifr reads it, then upload and expect a 422.
import sharp from "sharp";
import exifr from "exifr";

const SLUG = process.env.SLUG ?? "arjun-and-priya";
const BASE = process.env.BASE ?? "http://localhost:3000";

const buf = await sharp({
  create: { width: 800, height: 600, channels: 3, background: { r: 180, g: 140, b: 90 } },
})
  .withExif({ IFD2: { DateTimeOriginal: "2020:01:01 12:00:00" } })
  .jpeg({ quality: 90 })
  .toBuffer();

const parsed = await exifr.parse(buf, { pick: ["DateTimeOriginal"] });
console.log("exifr sees DateTimeOriginal:", parsed?.DateTimeOriginal);

const form = new FormData();
form.append("photo", new Blob([buf], { type: "image/jpeg" }), "old.jpg");
const res = await fetch(`${BASE}/api/events/${SLUG}/photos`, { method: "POST", body: form });
console.log(`Upload HTTP ${res.status}`, await res.text());
console.log(res.status === 422 ? "PASS: stale photo rejected" : "CHECK: expected 422");
