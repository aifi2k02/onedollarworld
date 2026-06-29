import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HeroPage } from "@/components/HeroPage";
import { getCountries, getCountry, getHeadline } from "@/lib/data";
import { headlinePhrase } from "@/lib/format";

// Static export: only the enumerated countries are built; anything else 404s.
export const dynamicParams = false;

// Pre-render a page per country (great for SEO + real shareable links).
export async function generateStaticParams() {
  const countries = await getCountries();
  return countries
    .filter((c) => c.bucket !== "anchor")
    .map((c) => ({ country: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string }>;
}): Promise<Metadata> {
  const { country: slug } = await params;
  const country = await getCountry(slug);
  const headline = await getHeadline(slug);
  if (!country || !headline) return { title: "OneDollar.World" };

  const phrase = headlinePhrase(headline);
  const title = `$1 in ${country.name} = ${phrase} | OneDollar.World`;
  const description = `In ${country.name}, one US dollar can buy ${phrase}. See what your dollar really does around the world.`;

  // og:image is auto-injected from app/[country]/opengraph-image.tsx.
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary_large_image" },
  };
}

export default async function CountryPage({
  params,
}: {
  params: Promise<{ country: string }>;
}) {
  const { country: slug } = await params;
  const country = await getCountry(slug);
  if (!country || country.bucket === "anchor") notFound();
  return <HeroPage initialSlug={slug} />;
}
