import { ImageResponse } from "next/og";
import { markDataUri } from "@/components/mark";

// Apple touch / home-screen icon — warm ivory tile with the gold mark.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #fffdf8 0%, #efe7d8 100%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          width={120}
          height={120}
          src={markDataUri({ ring: "#a07f3c", heart: "foil" })}
          alt=""
        />
      </div>
    ),
    { ...size },
  );
}
