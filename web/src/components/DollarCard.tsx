import type { Country, DollarBuy } from "@/lib/types";
import { headlinePhrase } from "@/lib/format";

// The shareable "magic card". Two-sided: anchor the reader's own dollar (almost
// nothing), then reveal what the same $1 does elsewhere. The gap IS the product.
export function DollarCard({
  country,
  headline,
  anchorHeadline,
}: {
  country: Country;
  headline: DollarBuy;
  anchorHeadline: DollarBuy; // same item, US — the "your dollar" side
}) {
  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 p-px shadow-2xl ring-1 ring-white/10">
      <div className="rounded-[23px] bg-slate-950/60 p-7 sm:p-9">
        <div className="flex items-center justify-between gap-2 text-[11px] font-medium uppercase tracking-widest text-emerald-300/80">
          <span className="whitespace-nowrap">OneDollar.World</span>
          <span className="whitespace-nowrap rounded-full bg-amber-400/10 px-2 py-0.5 text-amber-300/90">
            estimate
          </span>
        </div>

        {/* Your side */}
        <div className="mt-7">
          <p className="text-sm text-slate-400">To you, in the US</p>
          <p className="mt-1 text-lg text-slate-300">
            <span className="font-semibold text-white">$1</span> ≈{" "}
            {headlinePhrase(anchorHeadline)}
            <span className="text-slate-500"> — barely noticed</span>
          </p>
        </div>

        <div className="my-6 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

        {/* There side */}
        <div>
          <p className="flex items-center gap-2 text-sm text-slate-400">
            <span className="text-2xl leading-none">{country.flag}</span>
            The same $1, in {country.name}
          </p>
          <p className="mt-3 text-4xl font-bold leading-tight text-white sm:text-5xl">
            <span className="text-emerald-400">{headline.icon} </span>
            {headlinePhrase(headline)}
          </p>
        </div>

        <p className="mt-7 text-xs text-slate-500">
          Same dollar. A different life. · onedollar.world/{country.slug}
        </p>
      </div>
    </div>
  );
}
