# Deploying to Cloudflare Pages

The site is a **fully static export** (`output: "export"`) — no Workers, no adapter,
no runtime server. Cloudflare Pages just serves the files in `web/out/`. Share images
are generated at build time.

## Option A — Connect the GitHub repo (recommended: auto-deploy on push)

Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git** →
pick `aifi2k02/onedollarworld`, then set:

| Setting | Value |
|---|---|
| Production branch | `main` |
| Framework preset | `Next.js (Static HTML Export)` (or "None") |
| **Root directory** | `web` |
| **Build command** | `npm run build` |
| **Build output directory** | `out` |

**Environment variables** (Settings → Environment variables → Production):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ssovcsdjbbvvxznejxdy.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(the `sb_publishable_…` key)* |
| `NEXT_PUBLIC_SITE_URL` | your live URL — e.g. `https://onedollarworld.xyz` (or the `*.pages.dev` URL while testing) |

Deploy. Every `git push` to `main` rebuilds automatically.

> `NEXT_PUBLIC_SITE_URL` sets the absolute base for OG/share image URLs. If you launch
> on the `*.pages.dev` URL first, set it to that so unfurls resolve; switch to the
> custom domain once attached.

## Option B — Direct deploy from this machine (one-off)

```bash
cd web
npm run build
npx wrangler login           # opens browser once
npx wrangler pages deploy out --project-name onedollarworld
```

## Custom domain

Pages project → **Custom domains → Set up a domain** → `onedollarworld.xyz`
(Cloudflare manages DNS if the domain is on your account). Then make sure
`NEXT_PUBLIC_SITE_URL` matches and redeploy so share images point at the real domain.

## Notes

- `web/public/_headers` forces `Content-Type: image/png` on the extensionless
  `opengraph-image` files so social crawlers accept them. Don't remove it.
- Only the 14 amplifier/mid countries are built (`dynamicParams = false`); anchors
  and unknown slugs return the static 404.
- No secrets live in the repo. The publishable key is public-safe; the DB password
  and `service_role` key are never needed for this static build.
