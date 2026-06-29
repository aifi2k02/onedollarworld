"use client";

import { useState, type RefObject } from "react";
import { toBlob, toPng } from "html-to-image";
import type { Country, DollarBuy } from "@/lib/types";
import { headlinePhrase } from "@/lib/format";

// The growth engine: turn the card into a shareable PNG. Download always works;
// native Share / clipboard are used when the browser supports them.
export function ShareBar({
  targetRef,
  country,
  headline,
}: {
  targetRef: RefObject<HTMLElement | null>;
  country: Country;
  headline: DollarBuy;
}) {
  const [status, setStatus] = useState<string | null>(null);

  const shareText = `$1 = ${headlinePhrase(headline)} in ${country.name}. See where your dollar goes further →`;
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/${country.slug}`
      : `https://onedollar.world/${country.slug}`;

  async function capture(): Promise<Blob | null> {
    if (!targetRef.current) return null;
    return toBlob(targetRef.current, { pixelRatio: 2, cacheBust: true });
  }

  async function onDownload() {
    if (!targetRef.current) return;
    setStatus("Rendering…");
    try {
      const dataUrl = await toPng(targetRef.current, { pixelRatio: 2, cacheBust: true });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `onedollar-${country.slug}.png`;
      a.click();
      setStatus("Downloaded ✓");
    } catch {
      setStatus("Could not render image");
    }
    clearLater();
  }

  async function onShare() {
    setStatus("Rendering…");
    try {
      const blob = await capture();
      const file = blob
        ? new File([blob], `onedollar-${country.slug}.png`, { type: "image/png" })
        : null;
      const nav = navigator as Navigator & {
        canShare?: (d: ShareData) => boolean;
      };
      if (file && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], text: shareText, url: shareUrl });
        setStatus("Shared ✓");
      } else if (nav.share) {
        await nav.share({ text: shareText, url: shareUrl });
        setStatus("Shared ✓");
      } else {
        await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        setStatus("Copied to clipboard ✓");
      }
    } catch {
      setStatus(null);
    }
    clearLater();
  }

  async function onCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setStatus("Link copied ✓");
    } catch {
      setStatus("Could not copy");
    }
    clearLater();
  }

  function clearLater() {
    setTimeout(() => setStatus(null), 2500);
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        onClick={onShare}
        className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
      >
        Share this card
      </button>
      <button
        onClick={onDownload}
        className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
      >
        Download
      </button>
      <button
        onClick={onCopyLink}
        className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
      >
        Copy link
      </button>
      {status && <span className="ml-1 text-sm text-emerald-300">{status}</span>}
    </div>
  );
}
