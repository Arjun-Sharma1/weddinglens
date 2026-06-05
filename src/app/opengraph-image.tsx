import { ImageResponse } from "next/og";
import { markDataUri } from "@/components/mark";

// Social share card — ivory + champagne gold, mark over the wordmark + tagline.
export const alt = "WeddingLens Live — a live event photo wall";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(70% 60% at 50% 32%, #fffdf8 0%, #f8f3ea 55%, #efe7d8 100%)",
          fontFamily: "serif",
          padding: 80,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          width={132}
          height={132}
          src={markDataUri({ ring: "#a07f3c", heart: "foil" })}
          alt=""
        />

        <div
          style={{
            display: "flex",
            fontSize: 96,
            fontWeight: 600,
            letterSpacing: -2,
            marginTop: 36,
          }}
        >
          <span style={{ color: "#1b1714" }}>Wedding</span>
          <span style={{ color: "#a07f3c" }}>Lens</span>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 34,
            color: "#4a423b",
            textAlign: "center",
            maxWidth: 760,
          }}
        >
          Every guest, a photographer. Scan, snap, and watch photos appear on the
          big screen.
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginTop: 44,
            fontSize: 22,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: "#a07f3c",
          }}
        >
          Capture · Share · Celebrate
        </div>
      </div>
    ),
    { ...size },
  );
}
