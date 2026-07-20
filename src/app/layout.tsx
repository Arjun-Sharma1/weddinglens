import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
  display: "swap",
});

const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://weddinglens.live";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "WeddingLens Live — Real-Time Wedding & Event Photos",
    template: "%s · WeddingLens",
  },
  description:
    "Every guest, a photographer. Guests scan a QR code, snap a photo, and it appears on the big screen in seconds. No app, no sign-up.",
  applicationName: "WeddingLens Live",
  keywords: [
    "wedding photo wall",
    "live photo sharing",
    "QR photo upload",
    "wedding slideshow",
    "event photos",
  ],
  openGraph: {
    type: "website",
    siteName: "WeddingLens Live",
    title: "WeddingLens Live — Real-Time Wedding & Event Photos",
    description:
      "Guests scan a QR code, snap a photo, and it appears on the big screen in seconds. No app. No sign-up. Pure celebration.",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "WeddingLens Live",
    description:
      "Every guest, a photographer — a live event photo slideshow on the big screen.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f3ea" },
    { media: "(prefers-color-scheme: dark)", color: "#100d0b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${instrument.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
