// Mirrors the Supabase schema (see ../../../supabase/migrations/0001_init.sql).
// Components only ever touch these types, so swapping the local seed for live
// Supabase queries is a change inside lib/data/*, never in the UI.

export type Bucket = "anchor" | "amplifier" | "mid";
export type Confidence = "high" | "medium" | "low" | "estimate";

export interface Country {
  slug: string;
  name: string;
  iso2: string;
  flag: string;
  region: string;
  currencyCode: string;
  bucket: Bucket;
}

export interface BasketItem {
  key: string;
  name: string;
  category: string;
  unit: string;
  icon: string;
}

// One row of the v_dollar_buys view: what $1 does for a single item in a country.
export interface DollarBuy {
  itemKey: string;
  itemName: string;
  unit: string;
  icon: string;
  category: string;
  localPrice: number;
  currencyCode: string;
  usdPrice: number; // price of one unit in USD
  unitsPerUsd: number; // how many units $1 buys  <-- the magic number
  confidence: Confidence;
  source?: string; // where a curated value came from (null for derived estimates)
}
