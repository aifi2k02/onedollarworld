import { getCountries } from "@/lib/data";
import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/lib/og-image";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "What one dollar buys around the world";

// One static share image per country, generated at build time.
export async function generateStaticParams() {
  const countries = await getCountries();
  return countries
    .filter((c) => c.bucket !== "anchor")
    .map((c) => ({ country: c.slug }));
}

export default async function Image({ params }: { params: { country: string } }) {
  return ogImage(params.country);
}
