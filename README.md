# fda-approvals-mcp — SCAFFOLD

> Drug approvals, device clearances (510(k)), recalls, adverse events. Wraps the **openFDA** free API. Sister product to `sec-edgar-mcp` — same patterns, biotech audience instead of finance.

**Status:** scaffolded. Idea #4 in [`../../../ai-as-customer-ideas.md`](../../../ai-as-customer-ideas.md).

---

## Planned tools

| Tool | openFDA endpoint | Notes |
|---|---|---|
| `fda_drug_approval_search(date_range, sponsor?, indication?)` | `/drug/drugsfda.json` | New drug approvals (NDA/BLA). |
| `fda_drug_label(drug_name)` | `/drug/label.json` | Full drug label text. |
| `fda_recall_search(class?, date_range)` | `/drug/enforcement.json`, `/device/enforcement.json` | Class I/II/III recall events. |
| `fda_adverse_events(drug_name, date_range)` | `/drug/event.json` | FAERS adverse event reports — count + breakdown. |
| `fda_510k_search(date_range, sponsor?)` | `/device/510k.json` | Premium tier: device 510(k) clearances. |
| `fda_drug_shortages()` | drug shortage list | Premium. |

## Audience

- Clinical-LLM teams (Hippocratic, Glass, OpenEvidence, AmazeVet, Scribeberry).
- Pharma research analysts.
- Biotech / pharma investor agents (cross-sells with `sec-edgar-mcp`).
- Journalists covering pharma.

## Pricing (proposed)

Same tier shape as SEC EDGAR. Slightly higher willingness-to-pay in pharma → bias toward Team/Pro upsells.

## Open / closed split

- **Open**: MCP shim, openFDA wrapper (it's literally a public API; no moat).
- **Closed**: alerts/subscriptions, drug-name normalization (RxNorm cross-ref), de-duplication of FAERS reports (multiple reporters per event), enriched label parsing.

## Build steps

Same as SEC EDGAR. openFDA is even cleaner than EDGAR — JSON-RPC-compatible payloads, no User-Agent gymnastics, generous rate limits.

## See also

- [`../sec-edgar-mcp/`](../sec-edgar-mcp/) — reference implementation.
- [`../drug-interaction-mcp/`](../drug-interaction-mcp/) — pairs with this for clinical audience.
- [`../README.md`](../README.md) — Category 1 pipeline.


---

## Sister MCPs

All from the same operator, all live on `<product>.prakhar-cognizance.workers.dev`, all free-tier friendly:

| Group | Products |
|---|---|
| **Research** | [sec-edgar](https://github.com/guptaprakhariitr/sec-edgar-mcp) · [arxiv](https://github.com/guptaprakhariitr/arxiv-mcp) · [world-bank-economic](https://github.com/guptaprakhariitr/world-bank-economic-mcp) · [uspto-patents](https://github.com/guptaprakhariitr/uspto-patents-mcp) · [fda-approvals](https://github.com/guptaprakhariitr/fda-approvals-mcp) |
| **Verification + Utility** | [verification](https://github.com/guptaprakhariitr/verification-mcp) ⭐ · [unit-converter](https://github.com/guptaprakhariitr/unit-converter-mcp) |
| **India** | [indic-normalize](https://github.com/guptaprakhariitr/indic-normalize-mcp) · [indian-regulatory](https://github.com/guptaprakhariitr/indian-regulatory-mcp) |
| **Real-time** | [hn-trending](https://github.com/guptaprakhariitr/hn-trending-mcp) · [wikipedia-recent-changes](https://github.com/guptaprakhariitr/wikipedia-recent-changes-mcp) · [gdelt-events](https://github.com/guptaprakhariitr/gdelt-events-mcp) · [crypto-prices](https://github.com/guptaprakhariitr/crypto-prices-mcp) |
| **Healthcare** | [drug-interaction](https://github.com/guptaprakhariitr/drug-interaction-mcp) |
| **Logistics** | [multi-carrier-tracking](https://github.com/guptaprakhariitr/multi-carrier-tracking-mcp) |

Full catalog: https://github.com/guptaprakhariitr · ⭐ = empty-quadrant / highest-conviction pick.

