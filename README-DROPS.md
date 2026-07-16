# Eventful Drops — the database engine

Every drop does two jobs: it makes money today, and it captures ~300 real, consented local customers
(name, WhatsApp, email) into a database we own. That database compounds drop after drop until it's an
audience asset big brands (Grab, banks, telcos) pay to reach — **as sponsored drops and waitlist sends,
never by handing over the raw data** (that's what keeps it PDPA-clean and valuable).

Shopify **is** the database. Buyers land there automatically at checkout; waitlist signups land there
through `/api/signup` tagged per drop. One place to segment, blast, and export.

## The pieces

| URL | What it is |
|---|---|
| `/drops` | Public drop page — live drop + countdown + waitlist form. This is the link in bio. |
| `/audience` | Internal dashboard (token-gated): database size, per-drop capture, consent rate, latest signups. |
| `/partners` | Advertiser-facing pitch page with live aggregate stats (no personal data). |
| `/api/signup` | POST endpoint: waitlist signup → Shopify customer, tagged `drops-waitlist` + `drop-00X`, consent recorded. |
| `/api/audience` | Aggregate stats. Public mode returns rounded numbers; `?token=DASH_TOKEN` returns the full internal view. |
| `drops.json` (repo root) | The drop feed, same pattern as the radar feeds — the pages read it from raw.githubusercontent. |

## One-time setup (~10 minutes)

1. **Shopify Admin API token** — Shopify admin → Settings → Apps and sales channels →
   Develop apps → Create app ("Drops API") → Configure Admin API scopes:
   `read_customers`, `write_customers`, `read_products` → Install → copy the Admin API access token.
2. **Vercel env vars** (Project → Settings → Environment Variables):
   - `SHOPIFY_SHOP` = `a4aw7f-fd.myshopify.com`
   - `SHOPIFY_ADMIN_TOKEN` = the token from step 1
   - `DASH_TOKEN` = any long random string (this unlocks `/audience`)
3. Redeploy: `cd app && vercel --prod`

## Runbook: launching a drop

1. Create the product in Shopify (tag it `drop`, `drop-00X`; set inventory = the supply).
2. Add its entry to `drops.json` — copy the drop-001 block, set `status`, `variant_gid`
   (Shopify product → variant → copy GID from URL/API), `buy_url`, image, window, perk.
   - `"teaser"` + `drops_at` (unix ts) → countdown + "first access" waitlist push
   - `"live"` → buy button + live "only N of 300 left" scarcity counter
   - `"ended"` → sold-out state, waitlist keeps capturing for the next one
3. Commit + push `drops.json` to `main` — the page updates itself, no redeploy needed.
4. Announce on the Eventful pages; waitlist gets the link **before** the public post (that's the whole
   promise — keep it sacred).
5. After the drop: Shopify → Customers → segment by tag `drop-00X` → export → WhatsApp broadcast list
   for the next drop's early access.

## The flywheel

- Radar spots what's blowing up → that vendor becomes the next drop partner (they're hot *right now*).
- Drop sells out → +300 consented contacts → next drop sells out faster.
- Every drop's sellout + capture numbers feed `/partners` → the pitch to Grab-tier sponsors gets
  stronger automatically.

## Data rules (don't break these — they're the product)

- No consent, no signup: the API rejects submissions without the ticked box.
- Consent covers "Eventful + drop partners, email + WhatsApp" — good for sponsored sends *from us*.
- Never export/hand the list to a partner. Sponsors buy sends and drops, not data.
- Every send includes an opt-out; honour it same-day (Shopify handles email unsubscribes natively).
