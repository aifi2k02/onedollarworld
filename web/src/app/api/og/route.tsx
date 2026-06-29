import { ImageResponse } from "next/og";
import { getCountry, getDollarBuys, getHeadline } from "@/lib/data";
import { headlinePhrase } from "@/lib/format";

export const runtime = "edge";

// Dynamic share image: /api/og?country=ethiopia → 1200x630 PNG for link unfurls.
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("country") ?? "ethiopia";
  const country = await getCountry(slug);
  const headline = await getHeadline(slug);
  const usBuys = await getDollarBuys("united-states");

  if (!country || !headline) {
    return new ImageResponse(<FallbackCard />, { width: 1200, height: 630 });
  }

  const anchor = usBuys.find((b) => b.itemKey === headline.itemKey) ?? headline;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "linear-gradient(135deg, #0f172a 0%, #0f172a 55%, #022c22 100%)",
          color: "#e2e8f0",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24 }}>
          <span style={{ color: "#6ee7b7", letterSpacing: 4 }}>ONEDOLLAR.WORLD</span>
          <span style={{ color: "#fcd34d" }}>estimate · illustrative</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 30, color: "#94a3b8" }}>
            To you, in the US — $1 ≈ {headlinePhrase(anchor)}, barely noticed.
          </span>
          <span style={{ fontSize: 34, color: "#cbd5e1", marginTop: 28 }}>
            {country.flag}  The same $1, in {country.name}
          </span>
          <span
            style={{
              fontSize: 88,
              fontWeight: 800,
              color: "#ffffff",
              marginTop: 8,
              lineHeight: 1.05,
            }}
          >
            {headline.icon} {headlinePhrase(headline)}
          </span>
        </div>

        <span style={{ fontSize: 24, color: "#64748b" }}>
          Same dollar. A different life. · onedollar.world/{country.slug}
        </span>
      </div>
    ),
    { width: 1200, height: 630, emoji: "twemoji" },
  );
}

function FallbackCard() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f172a",
        color: "#ffffff",
        fontSize: 64,
        fontWeight: 800,
      }}
    >
      One Dollar. Millions of different lives.
    </div>
  );
}
