# Tools Reference — fda-approvals-mcp

Per-tool reference for AI agents. The descriptions below are what the LLM reads to decide whether to call your tool — verbatim from `src/tools.ts`.

## `fda_drug_approval_search`

Search FDA drug approvals from Drugs@FDA. Filter by sponsor, brand name, generic name, or approval date range. Returns the application number, sponsor, brand/generic name, and approval date for each approval (NDA / BLA / supplemental).

See `src/tools.ts` for the JSON Schema input.

## `fda_drug_label`

Fetch the FDA-approved drug label for a brand or generic name. Includes indications, dosage, contraindications, warnings, adverse reactions.

See `src/tools.ts` for the JSON Schema input.

## `fda_recall_search`

Search drug, device, or food recall events. Filter by classification (Class I = most serious) and date range. Returns recall number, classification, reason, recalling firm, status.

See `src/tools.ts` for the JSON Schema input.

## `fda_adverse_events`

Aggregate FDA adverse-event reports (FAERS) for a drug. Deduplicates by safetyreportid (bug fixed in 0.2.1). Returns total reports, unique reaction count, and top 20 reactions by frequency in the requested window.

See `src/tools.ts` for the JSON Schema input.

## `fda_drug_shortages`

Current FDA-tracked drug-shortage list. Premium tool.

See `src/tools.ts` for the JSON Schema input.

## Client setup

### Cursor / Claude Desktop / Cline
```json
{
  "mcpServers": {
    "fda-approvals-mcp": {
      "url": "https://fda-approvals-mcp.atlasword.workers.dev/mcp",
      "headers": { "Authorization": "Bearer YOUR_API_KEY" }
    }
  }
}
```

Anonymous requests get the free tier (100 calls/month, 10/min). Upgrade at `/upgrade?tier=solo|team|pro`.