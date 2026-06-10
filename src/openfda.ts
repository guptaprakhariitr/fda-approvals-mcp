// openFDA API client.
// Docs: https://open.fda.gov/apis/
// Free, no key required, but ~240 req/min unauth; with key 1000 req/min.

import { KvCache, stableKey } from "./cache";

export interface OpenFdaEnv {
  CACHE: KVNamespace;
  OPENFDA_BASE: string;            // https://api.fda.gov
  OPENFDA_API_KEY?: string;
}

export interface DrugApproval {
  application_number: string;
  sponsor_name: string;
  submission_type: string;          // "ORIG", "SUPPL"
  submission_status: string;        // "AP" approved
  submission_status_date: string;   // YYYYMMDD → we'll normalize
  brand_name?: string;
  generic_name?: string;
  indication?: string;
}

export interface Recall {
  recall_number: string;
  classification: "Class I" | "Class II" | "Class III";
  product_description: string;
  reason_for_recall: string;
  recall_initiation_date: string;
  status: string;
  recalling_firm: string;
}

export interface AdverseEventAggregate {
  drug: string;
  totalReports: number;
  uniqueEvents: number;
  topReactions: Array<{ reaction: string; count: number }>;
  windowFrom: string;
  windowTo: string;
}

export class OpenFdaClient {
  private cache: KvCache;
  constructor(private env: OpenFdaEnv) { this.cache = new KvCache(env.CACHE, "fda"); }

  async searchDrugApprovals(opts: {
    sponsor?: string; brand?: string; generic?: string;
    dateFrom?: string; dateTo?: string; limit?: number; skip?: number;
  }): Promise<DrugApproval[]> {
    const search = buildSearch({
      "sponsor_name": opts.sponsor,
      "products.brand_name": opts.brand,
      "products.active_ingredients.name": opts.generic,
      "submissions.submission_status": "AP",
      "submissions.submission_status_date": dateRange(opts.dateFrom, opts.dateTo),
    });
    const key = `approvals:${stableKey(opts)}`;
    const json = await this.cache.memoize(key, 60 * 60 * 6, () =>
      this.get(`/drug/drugsfda.json?search=${encodeURIComponent(search)}&limit=${opts.limit ?? 25}&skip=${opts.skip ?? 0}`)
    );
    return (json?.results ?? []).flatMap((r: any) =>
      (r.submissions ?? []).filter((s: any) => s.submission_status === "AP").map((s: any) => ({
        application_number: r.application_number,
        sponsor_name: r.sponsor_name,
        submission_type: s.submission_type,
        submission_status: s.submission_status,
        submission_status_date: s.submission_status_date,
        brand_name: r.products?.[0]?.brand_name,
        generic_name: r.products?.[0]?.active_ingredients?.[0]?.name,
        indication: r.products?.[0]?.dosage_form,
      }))
    );
  }

  async getDrugLabel(drugName: string): Promise<unknown> {
    const search = `openfda.brand_name:"${drugName}" OR openfda.generic_name:"${drugName}"`;
    const key = `label:${drugName.toLowerCase()}`;
    return this.cache.memoize(key, 60 * 60 * 24, () =>
      this.get(`/drug/label.json?search=${encodeURIComponent(search)}&limit=1`)
    );
  }

  async searchRecalls(opts: {
    domain?: "drug" | "device" | "food";
    productClass?: "Class I" | "Class II" | "Class III";
    dateFrom?: string; dateTo?: string; limit?: number;
  }): Promise<Recall[]> {
    const domain = opts.domain ?? "drug";
    const search = buildSearch({
      "classification": opts.productClass,
      "recall_initiation_date": dateRange(opts.dateFrom, opts.dateTo),
    });
    const key = `recall:${domain}:${stableKey(opts)}`;
    const json = await this.cache.memoize(key, 60 * 60, () =>
      this.get(`/${domain}/enforcement.json?search=${encodeURIComponent(search)}&limit=${opts.limit ?? 25}`)
    );
    return json?.results ?? [];
  }

  /**
   * Aggregate adverse-event reports for a drug.
   * Bug fix 0.2.1: deduplicate by report_number before counting reactions.
   */
  async adverseEventsAggregate(opts: {
    drug: string; dateFrom?: string; dateTo?: string; limit?: number;
  }): Promise<AdverseEventAggregate> {
    const search = buildSearch({
      "patient.drug.openfda.generic_name": opts.drug,
      "receivedate": dateRange(opts.dateFrom, opts.dateTo),
    });
    const limit = Math.min(opts.limit ?? 100, 1000);
    const key = `adverse:${stableKey(opts)}`;
    const json: any = await this.cache.memoize(key, 60 * 60 * 6, () =>
      this.get(`/drug/event.json?search=${encodeURIComponent(search)}&limit=${limit}`)
    );
    const results = json?.results ?? [];

    // Bug-fixed dedup: many adverse events appear multiple times under different
    // case IDs when reported by both physician and patient.
    const seenReports = new Set<string>();
    const reactionCounts: Record<string, number> = {};
    let totalReports = 0;
    for (const r of results) {
      if (r.safetyreportid && seenReports.has(r.safetyreportid)) continue;
      if (r.safetyreportid) seenReports.add(r.safetyreportid);
      totalReports++;
      for (const reaction of r.patient?.reaction ?? []) {
        const name = reaction.reactionmeddrapt;
        if (!name) continue;
        reactionCounts[name] = (reactionCounts[name] ?? 0) + 1;
      }
    }

    const top = Object.entries(reactionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([reaction, count]) => ({ reaction, count }));

    return {
      drug: opts.drug,
      totalReports,
      uniqueEvents: Object.keys(reactionCounts).length,
      topReactions: top,
      windowFrom: opts.dateFrom ?? "",
      windowTo: opts.dateTo ?? "",
    };
  }

  async search510k(opts: {
    sponsor?: string; deviceName?: string; dateFrom?: string; dateTo?: string; limit?: number;
  }): Promise<unknown[]> {
    const search = buildSearch({
      "applicant": opts.sponsor,
      "device_name": opts.deviceName,
      "decision_date": dateRange(opts.dateFrom, opts.dateTo),
    });
    const json: any = await this.cache.memoize(`510k:${stableKey(opts)}`, 60 * 60 * 6, () =>
      this.get(`/device/510k.json?search=${encodeURIComponent(search)}&limit=${opts.limit ?? 25}`)
    );
    return json?.results ?? [];
  }

  async drugShortages(): Promise<unknown[]> {
    // OpenFDA's drugshortages endpoint is now `/drug/shortages.json`
    const json: any = await this.cache.memoize("shortages", 60 * 60 * 12, () =>
      this.get(`/drug/shortages.json?limit=100`)
    );
    return json?.results ?? [];
  }

  // ── Low-level fetch ───────────────────────────────────────────────────────

  private async get(path: string): Promise<any> {
    const sep = path.includes("?") ? "&" : "?";
    const url = `${this.env.OPENFDA_BASE}${path}${this.env.OPENFDA_API_KEY ? `${sep}api_key=${this.env.OPENFDA_API_KEY}` : ""}`;
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (r.status === 404) return { results: [] };
    if (!r.ok) {
      const body = await r.text();
      throw new Error(`openFDA ${r.status}: ${body.slice(0, 200)}`);
    }
    return r.json();
  }
}

// ── Helpers (broken out for testability) ─────────────────────────────────────

export function buildSearch(parts: Record<string, string | undefined>): string {
  return Object.entries(parts)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}:${quoteIfNeeded(v!)}`)
    .join("+AND+");
}

export function dateRange(from?: string, to?: string): string | undefined {
  if (!from && !to) return undefined;
  const norm = (d: string) => d.replace(/-/g, "");
  const a = from ? norm(from) : "19000101";
  const b = to ? norm(to) : "21000101";
  return `[${a}+TO+${b}]`;
}

function quoteIfNeeded(v: string): string {
  if (v.startsWith("[") && v.endsWith("]")) return v;
  if (v.includes(" ")) return `"${v}"`;
  return v;
}
