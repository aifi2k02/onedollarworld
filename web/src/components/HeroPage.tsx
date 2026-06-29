import { Explorer, type CountryPayload } from "@/components/Explorer";
import { getCountries, getDollarBuys, getHeadline } from "@/lib/data";

// Shared view for "/" and "/[country]". Builds every payload server-side so the
// client Explorer can switch countries instantly with no fetch.
export async function HeroPage({ initialSlug }: { initialSlug?: string }) {
  const countries = await getCountries();

  const payloads: CountryPayload[] = (
    await Promise.all(
      countries
        .filter((c) => c.bucket !== "anchor") // amplifiers + mid: where $1 does a lot
        .map(async (country) => {
          const [buys, headline] = await Promise.all([
            getDollarBuys(country.slug),
            getHeadline(country.slug),
          ]);
          return headline ? { country, buys, headline } : null;
        }),
    )
  ).filter((p): p is CountryPayload => p !== null);

  const usBuys = await getDollarBuys("united-states");

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(16,185,129,0.12),transparent)]" />
      <div className="relative mx-auto max-w-6xl px-5 py-14 sm:py-20">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-emerald-400/80">
            OneDollar.World
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight text-white sm:text-6xl">
            One Dollar.
            <br />
            <span className="bg-gradient-to-r from-emerald-300 to-teal-400 bg-clip-text text-transparent">
              Millions of different lives.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-400">
            The dollar you wouldn&apos;t notice dropping in a tip jar can be a meal, a
            day of clean water, or a ride to work somewhere else. See where.
          </p>
        </header>

        <section className="mt-14">
          <Explorer payloads={payloads} usBuys={usBuys} initialSlug={initialSlug} />
        </section>

        <footer className="mt-16 border-t border-white/5 pt-6 text-center text-xs text-slate-600">
          All figures shown are <span className="text-amber-300/80">illustrative estimates</span>{" "}
          for this preview — not verified facts. Real data carries a source, a date, and a
          confidence score.
        </footer>
      </div>
    </main>
  );
}
