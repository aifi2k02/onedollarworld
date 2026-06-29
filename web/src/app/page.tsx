import type { Metadata } from "next";
import { HeroPage } from "@/components/HeroPage";

export const metadata: Metadata = {
  title: "OneDollar.World — what one dollar really does, around the world",
  description:
    "The dollar you wouldn't notice can be a meal, a day of clean water, or a ride to work somewhere else. See where your dollar goes further.",
  openGraph: {
    title: "One Dollar. Millions of different lives.",
    description: "See what $1 really does across the world.",
    // og:image is auto-injected from app/opengraph-image.tsx (built statically).
  },
  twitter: { card: "summary_large_image" },
};

export default function Home() {
  return <HeroPage />;
}
