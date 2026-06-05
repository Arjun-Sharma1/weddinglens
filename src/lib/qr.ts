import "server-only";
import QRCode from "qrcode";

/** Build the guest upload URL for an event slug. */
export function uploadUrl(slug: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/event/${slug}/upload`;
}

/** QR as inline SVG (dark modules, transparent background) for display screens. */
export async function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#100d0b", light: "#00000000" },
  });
}

/** QR as a PNG data URL (used for downloads / admin). */
export async function qrPngDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    margin: 1,
    width: 720,
    errorCorrectionLevel: "M",
    color: { dark: "#100d0b", light: "#ffffff" },
  });
}
