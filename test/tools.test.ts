import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OpenFdaClient, buildSearch, dateRange } from "../src/openfda";
import { McpServer, ToolContext } from "../src/mcp-server";
import { buildTools } from "../src/tools";

class FakeKv {
  store = new Map<string, string>();
  async get(key: string, type?: "text" | "json"): Promise<any> {
    const v = this.store.get(key); if (v === undefined) return null;
    if (type === "json") return JSON.parse(v); return v;
  }
  async put(key: string, value: string): Promise<void> { this.store.set(key, value); }
  async delete(key: string): Promise<void> { this.store.delete(key); }
}

const env = {
  CACHE: new FakeKv() as unknown as KVNamespace,
  USAGE: new FakeKv() as unknown as KVNamespace,
  OPENFDA_BASE: "https://api.fda.gov",
  UPGRADE_URL: "x",
};

// Fabricated openFDA responses
const fixApprovalsOzempic = {
  results: [
    {
      application_number: "NDA209637",
      sponsor_name: "NOVO NORDISK INC",
      submissions: [
        { submission_type: "ORIG", submission_status: "AP", submission_status_date: "20171205" },
        { submission_type: "SUPPL", submission_status: "AP", submission_status_date: "20221013" },
      ],
      products: [{ brand_name: "OZEMPIC", active_ingredients: [{ name: "SEMAGLUTIDE" }], dosage_form: "INJECTION" }],
    },
  ],
};

const fixAdverseSemaglutide = {
  results: [
    { safetyreportid: "R1", patient: { reaction: [{ reactionmeddrapt: "NAUSEA" }, { reactionmeddrapt: "VOMITING" }] } },
    { safetyreportid: "R1", patient: { reaction: [{ reactionmeddrapt: "NAUSEA" }, { reactionmeddrapt: "DIARRHEA" }] } }, // duplicate report
    { safetyreportid: "R2", patient: { reaction: [{ reactionmeddrapt: "NAUSEA" }] } },
    { safetyreportid: "R3", patient: { reaction: [{ reactionmeddrapt: "HEADACHE" }] } },
  ],
};

const fixRecallDrugs = {
  results: [
    { recall_number: "D-1234-2026", classification: "Class II", product_description: "Acme Cough Syrup 100ml", reason_for_recall: "Contamination", recall_initiation_date: "20260501", status: "Ongoing", recalling_firm: "Acme Pharma" },
  ],
};

beforeEach(() => {
  (env.CACHE as any).store = new Map();
  vi.stubGlobal("fetch", async (url: string | URL) => {
    const u = typeof url === "string" ? url : url.toString();
    if (u.includes("/drug/drugsfda.json"))     return new Response(JSON.stringify(fixApprovalsOzempic), { status: 200 });
    if (u.includes("/drug/event.json"))        return new Response(JSON.stringify(fixAdverseSemaglutide), { status: 200 });
    if (u.includes("/drug/enforcement.json"))  return new Response(JSON.stringify(fixRecallDrugs), { status: 200 });
    if (u.includes("/drug/label.json"))        return new Response(JSON.stringify({ results: [{ openfda: { brand_name: ["OZEMPIC"] } }] }), { status: 200 });
    return new Response(JSON.stringify({ results: [] }), { status: 200 });
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("openFDA query building", () => {
  it("buildSearch composes AND-joined search params", () => {
    expect(buildSearch({ a: "1", b: "two words" })).toBe('a:1+AND+b:"two words"');
  });
  it("dateRange formats range", () => {
    expect(dateRange("2026-01-01", "2026-06-01")).toBe("[20260101+TO+20260601]");
  });
  it("dateRange returns undefined for empty", () => {
    expect(dateRange()).toBeUndefined();
  });
});

describe("OpenFdaClient", () => {
  it("returns approvals filtered to AP submissions", async () => {
    const c = new OpenFdaClient(env as any);
    const out = await c.searchDrugApprovals({ generic: "semaglutide" });
    expect(out.length).toBe(2);                         // ORIG + SUPPL approvals
    expect(out[0].brand_name).toBe("OZEMPIC");
    expect(out[0].sponsor_name).toBe("NOVO NORDISK INC");
  });

  it("dedupes adverse-event reports by safetyreportid (0.2.1 bug fix)", async () => {
    const c = new OpenFdaClient(env as any);
    const agg = await c.adverseEventsAggregate({ drug: "semaglutide" });
    // 4 result rows but only 3 unique report ids → 3 reports
    expect(agg.totalReports).toBe(3);
    // Top reaction should be NAUSEA (appears in R1 and R2 = 2 times after dedup,
    // not 3 which would be the buggy count counting both R1 rows).
    const nausea = agg.topReactions.find((r) => r.reaction === "NAUSEA");
    expect(nausea?.count).toBe(2);
  });

  it("returns recalls with classification preserved", async () => {
    const c = new OpenFdaClient(env as any);
    const out = await c.searchRecalls({ productClass: "Class II" });
    expect(out.length).toBe(1);
    expect(out[0].classification).toBe("Class II");
  });

  it("getDrugLabel hits the right endpoint", async () => {
    const c = new OpenFdaClient(env as any);
    const out: any = await c.getDrugLabel("Ozempic");
    expect(out.results[0].openfda.brand_name[0]).toBe("OZEMPIC");
  });
});

describe("MCP protocol", () => {
  const server = new McpServer({ name: "fda-approvals-mcp", version: "0.2.1" });
  for (const t of buildTools()) server.register(t);
  const ctx: ToolContext = { env: env as any, apiKey: null, tier: "free", callsRemaining: 100 };

  it("free tier hides 510k and shortages", async () => {
    const r = await server.handle({ jsonrpc: "2.0", id: 1, method: "tools/list" }, ctx);
    const names = (r!.result as any).tools.map((t: any) => t.name) as string[];
    expect(names).not.toContain("fda_510k_search");
    expect(names).not.toContain("fda_drug_shortages");
    expect(names).toContain("fda_drug_approval_search");
    expect(names).toContain("fda_adverse_events");
  });

  it("team tier exposes premium tools", async () => {
    const teamCtx = { ...ctx, tier: "team" as const };
    const r = await server.handle({ jsonrpc: "2.0", id: 2, method: "tools/list" }, teamCtx);
    const names = (r!.result as any).tools.map((t: any) => t.name) as string[];
    expect(names).toContain("fda_510k_search");
    expect(names).toContain("fda_drug_shortages");
  });

  it("fda_drug_approval_search end-to-end", async () => {
    const r = await server.handle(
      { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "fda_drug_approval_search", arguments: { generic: "semaglutide" } } }, ctx
    );
    const out = JSON.parse((r!.result as any).content[0].text);
    expect(out.count).toBe(2);
  });

  it("fda_adverse_events end-to-end (deduped)", async () => {
    const r = await server.handle(
      { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "fda_adverse_events", arguments: { drug: "semaglutide" } } }, ctx
    );
    const out = JSON.parse((r!.result as any).content[0].text);
    expect(out.totalReports).toBe(3);
  });
});
