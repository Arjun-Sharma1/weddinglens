import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getEventBySlug, getApprovedPhotos } from "@/lib/events";
import { eventMetadata } from "@/lib/metadata";
import { uploadUrl, qrSvg } from "@/lib/qr";
import { PhotoWall } from "@/components/PhotoWall";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return eventMetadata(await getEventBySlug(slug), "wall");
}

export default async function WallPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const [photos, qr] = await Promise.all([
    getApprovedPhotos(event.id),
    qrSvg(uploadUrl(slug)),
  ]);

  return (
    <PhotoWall
      event={event}
      initialPhotos={photos}
      qrMarkup={qr}
      uploadHref={uploadUrl(slug)}
    />
  );
}
