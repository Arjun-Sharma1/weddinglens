import { ImageResponse } from "next/og";
import { markDataUri } from "@/components/mark";

// Generated favicon — gold lens-and-heart mark on a deep ink tile so it reads
// clearly in browser tabs and bookmarks.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1b1714",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img width={28} height={28} src={markDataUri({ ring: "#c2a15b", heart: "foil" })} alt="" />
      </div>
    ),
    { ...size },
  );
}
