import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Sign in · WeddingLens Live" },
  robots: { index: false, follow: false },
  openGraph: { siteName: "WeddingLens Live", title: "Sign in · WeddingLens Live" },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
