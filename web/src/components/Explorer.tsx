"use client";

import { useMemo, useRef, useState } from "react";
import type { Country, DollarBuy } from "@/lib/types";
import { DollarCard } from "./DollarCard";
import { ShareBar } from "./ShareBar";
import { confidenceMeta, localPriceLabel, quantityPhrase } from "@/lib/format";

export interface CountryPayload {
  country: Country;
  buys: DollarBuy[];
  headline: DollarBuy;
}

export function Explorer({
  payloads,
  usBuys,
  initialSlug,
}: {
  payloads: CountryPayload[];
  usBuys: DollarBuy[];
  initialSlug?: string;
}) {
  // Default to the country with the most dramatic single buy — let data pick the hero.
  const defaultSlug = useMemo(
    () =>
      [...payloads].sort((a, b) => b.headline.unitsPerUsd - a.headline.unitsPerUsd)[0]
        ?.country.slug,
    [payloads],
  );
  const [slug, setSlug] = useState(initialSlug ?? defaultSlug);
  const cardRef = useRef<HTMLDivElement>(null);

  const current = payloads.find((p) => p.country.slug === slug) ?? payloads[0];
  const anchorHeadline =
    usBuys.find((b) => b.itemKey === current.headline.itemKey) ?? current.headline;

  // Sort the buy grid by "most you get" — drama first. Labor row shown separately.
  const buys = [...current.buys]
    .filter((b) => b.category !== "labor")
    .sort((a, b) => b.unitsPerUsd - a.unitsPerUsd);
  const labor = current.buys.find((b) => b.category === "labor");

  return (
    <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
      {/* Left: selector + card */}
      <div className="flex flex-col gap-5">
        <label className="text-sm text-slate-400">
          See what <span className="font-semibold text-emerald-400">$1</span> does in…
          <select
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-base text-white outline-none focus:border-emerald-400/60"
          >
            {[...payloads]
              .sort((a, b) => a.country.name.localeCompare(b.country.name))
              .map((p) => (
                <option key={p.country.slug} value={p.country.slug}>
                  {p.country.flag} {p.country.name}
                </option>
              ))}
          </select>
        </label>

        <div ref={cardRef}>
          <DollarCard
            country={current.country}
            headline={current.headline}
            anchorHeadline={anchorHeadline}
          />
        </div>

        <ShareBar
          targetRef={cardRef}
          country={current.country}
          headline={current.headline}
        />

        {labor && (
          <p className="text-center text-sm text-slate-400">
            ⏱️ In {current.country.name}, earning that{" "}
            <span className="font-semibold text-white">$1</span> takes about{" "}
            <span className="font-semibold text-emerald-300">
              {Math.round(60 / labor.unitsPerUsd)} min
            </span>{" "}
            of minimum-wage work.
          </p>
        )}
      </div>

      {/* Right: what $1 buys, full basket */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-white">
            What $1 buys in {current.country.name}
          </h2>
          <span className="text-xs text-amber-300/80">estimates</span>
        </div>
        <ul className="mt-4 divide-y divide-white/5">
          {buys.map((b) => (
            <li key={b.itemKey} className="flex items-center gap-4 py-3">
              <span className="text-2xl">{b.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{b.itemName}</p>
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  {localPriceLabel(b)} each · ${b.usdPrice.toFixed(2)}
                  <span
                    className={`inline-flex items-center gap-1 ${confidenceMeta(b.confidence).text}`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${confidenceMeta(b.confidence).dot}`}
                    />
                    {confidenceMeta(b.confidence).label}
                  </span>
                </p>
              </div>
              <span className="shrink-0 text-right text-sm font-semibold text-emerald-300">
                {quantityPhrase(b)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
