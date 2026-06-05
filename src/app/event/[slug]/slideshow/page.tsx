import { notFound } from "next/navigation";
import { getEventBySlug, getApprovedPhotos } from "@/lib/events";
import { uploadUrl, qrSvg } from "@/lib/qr";
import { Slideshow } from "@/components/Slideshow";

export const dynamic = "force-dynamic";

export default async function SlideshowPage({
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
    <Slideshow
      event={event}
      initialPhotos={photos}
      qrMarkup={qr}
      uploadHref={uploadUrl(slug)}
    />
  );
}
