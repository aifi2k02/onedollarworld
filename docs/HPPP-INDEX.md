# Human Purchasing Power Index (HPPP) — Methodology v0.1

The HPPP is OneDollar.World's **signature, citable metric**: a single 0–100 score for
"how much real life one local unit of money buys." It is the asset competitors can't
copy and the thing journalists will link to. Its credibility depends entirely on the
methodology being **public and reproducible** — so we publish it.

## What it measures

Not wealth. Not exchange rates. **Affordability of essentials relative to local earnings.**
A country where a meal costs 10 minutes of minimum-wage work scores high; one where it
costs 2 hours scores low — regardless of how rich the country is in dollar terms.

## Pillars (each 0–100, then weighted)

| Pillar | Built from basket items | Weight |
|---|---|---|
| Food affordability | meal_simple, bread, rice, eggs, milk | 30% |
| Water | water_bottle | 10% |
| Transport | bus_fare | 15% |
| Communication | mobile_data | 10% |
| Health | doctor_visit | 15% |
| Earnings power | labor_hour vs essentials | 20% |

## Core normalization: "minutes of work per essential"

For each priced item we compute the **time cost**:

```
minutes_of_work = local_price / (labor_hour_wage / 60)
```

This removes currency and income distortion in one step — it's the empathy number
("how long must someone work to afford this?") AND the comparability number. Each pillar
score is the time cost mapped onto 0–100 against a global reference band (cheapest
observed essential = 100, a defined upper bound = 0).

## Composite

```
HPPP = Σ (pillar_score × weight)
```

Stored in `hppp_scores` with the **per-pillar `components` jsonb** kept so every score
can "show its work" on the country page. Bump `methodology_version` whenever weights,
pillars, or the basket change — old scores stay for historical comparison.

## Transparency requirements (non-negotiable)

- Publish this page openly; link to it from every score.
- Show the confidence of the underlying prices — a score built on `low`-confidence data
  is itself labelled low-confidence.
- Never show a score for a country whose basket is incomplete; show "not yet rated".

## v0.1 → later

v0.1 uses the 10-item basket. v0.2+ can fold in housing/rent, education, and PPP factor
once those datasets are seeded. Keep the score stable and documented; resist the urge to
tweak weights for nicer-looking rankings — that's how trust dies.
