# Registry Submission Checklist — fda-approvals-mcp

Pre-filled values for every MCP registry. Each submission takes 1–3 minutes in a browser.

## ✅ Already automatic

### Glama — `glama.ai`
Auto-crawls GitHub by repo topic `mcp-server`. Already tagged. Indexes within 24 hours.
- https://glama.ai/mcp/servers?q=fda-approvals-mcp

### Official MCP Registry
- The `server.json` at this repo's root is the registry manifest.
- Submit via: `mcp-publisher publish server.json` (after `make publisher` and `mcp-publisher login github` in the registry repo).
- Downstream registries (PulseMCP, mcp.so) ingest from here weekly.

## 🌐 Manual browser submission

### PulseMCP — single URL field
- https://www.pulsemcp.com/submit
- **Paste:** `https://github.com/guptaprakhariitr/fda-approvals-mcp`

### mcp.so — multi-field form
- https://mcp.so/submit
- **Name:** `fda-approvals-mcp`
- **Display name:** `FDA Approvals & Recalls`
- **Description:** `Drug approvals, device 510(k) clearances, recalls, and adverse-event reports — wraps openFDA.`
- **GitHub URL:** `https://github.com/guptaprakhariitr/fda-approvals-mcp`
- **Endpoint URL:** `https://fda-approvals-mcp.prakhar-cognizance.workers.dev/mcp`
- **Tags:** fda, openfda, drug-approval, 510k, recall, faers, clinical-llm
- **License:** MIT
- **Transport:** HTTP (remote)

### mcp.directory
- https://mcp.directory/submit
- Same values as mcp.so. Include a demo GIF if you can.

### Smithery (paid — $30/mo)
- https://smithery.ai/new
- Worth it if you have ≥6 paid subscribers.

### Cursor Marketplace
- Submit from Cursor → Settings → Marketplace → Submit. Curated; 1–2 weeks for approval.

## Social

### Show HN
- Title: `Show HN: fda-approvals-mcp — FDA Approvals & Recalls as an MCP for Claude / Cursor`
- URL: `https://github.com/guptaprakhariitr/fda-approvals-mcp`

### Twitter / X thread template
> Just shipped fda-approvals-mcp — Model Context Protocol server: drug approvals, device 510(k) clearances, recalls, and adverse-event reports — wraps openfda.
>
> Endpoint: https://fda-approvals-mcp.prakhar-cognizance.workers.dev/mcp
> GitHub: https://github.com/guptaprakhariitr/fda-approvals-mcp
>
> Free tier available. Paid from $9/mo.
