# Changelog

## [0.3.0] — 2026-06-10

### Changed
- **Billing migrated to Dodo Payments** (was: planned Stripe). Merchant-of-Record model — Dodo handles VAT/GST/sales-tax remittance worldwide on our behalf, lifting tax compliance off the operator.
- Env vars: `STRIPE_*` → `DODO_API_KEY` / `DODO_WEBHOOK_SECRET`. New `[vars]`: `DODO_PRODUCT_ID_{SOLO,TEAM,PRO}`, `PRODUCT_NAME`, `FROM_EMAIL`.

### Added
- `GET /upgrade?tier=…` — creates a Dodo hosted checkout link, 302s to it.
- `GET /account` — returns the caller's key + tier + Dodo customer-portal link (requires `Authorization: Bearer …`).
- `POST /webhooks/dodo` — verifies Standard-Webhooks signature (HMAC-SHA256 + 5-minute replay window), mints API keys on `subscription.active`, downgrades on cancellation/failure, idempotent on retries.
- `src/dodo.ts`, `src/webhook.ts`, `src/checkout.ts` — vendored shim, identical across all Category-1 products.
- `mintApiKey()`, `updateKeyStatus()`, `getKeyBySubscription()` in `auth.ts`.
- `KeyRecord.status` field — tracks `active` / `cancelled` / `past_due`.
- Optional Resend integration: API key emailed to the customer on subscription start.


## [0.2.1] — 2026-06-05

### Fixed
- `fda_adverse_events` returned counts of *reports*, which double-counts when the same event is reported by multiple sources. Now de-duplicates by `report_number` before aggregating.

## [0.2.0] — 2026-05-12

### Added
- `fda_510k_search` — device 510(k) clearances (premium).
- `fda_drug_shortages` — current drug-shortage list (premium).
- Pagination across all search tools (`skip` + `limit` params, max 1000 records).

### Changed
- Cache TTL for recall searches lowered to 1h (recalls update during the day).

## [0.1.0] — 2026-04-22

### Added
- Initial release. Tools: `fda_drug_approval_search`, `fda_drug_label`, `fda_recall_search`, `fda_adverse_events`.
- KV-cached responses with 6h TTL.
- Listed on Smithery, Glama, mcp.so.
