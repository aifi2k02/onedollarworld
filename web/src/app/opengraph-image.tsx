import { getTopCountrySlug } from "@/lib/data";
import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/lib/og-image";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "OneDollar.World — what one dollar really does, around the world";

// Homepage share image = the most dramatic country (generated at build time).
export default async function Image() {
  return ogImage(await getTopCountrySlug());
}
