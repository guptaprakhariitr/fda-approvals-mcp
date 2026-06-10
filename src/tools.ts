import { Tool } from "./mcp-server";
import { OpenFdaClient, OpenFdaEnv } from "./openfda";

export function buildTools(): Tool[] {
  return [
    {
      name: "fda_drug_approval_search",
      description:
        "Search FDA drug approvals from Drugs@FDA. Filter by sponsor, brand name, generic name, or approval date range. Returns the application number, sponsor, brand/generic name, and approval date for each approval (NDA / BLA / supplemental).",
      inputSchema: {
        type: "object",
        properties: {
          sponsor: { type: "string", description: "Company/sponsor name, e.g. 'Pfizer'." },
          brand: { type: "string" },
          generic: { type: "string", description: "Generic ingredient, e.g. 'semaglutide'." },
          date_from: { type: "string", description: "ISO YYYY-MM-DD." },
          date_to: { type: "string", description: "ISO YYYY-MM-DD." },
          limit: { type: "integer", default: 25, minimum: 1, maximum: 100 },
          skip: { type: "integer", default: 0 },
        },
        required: [],
      },
      handler: async (args, ctx) => {
        const c = new OpenFdaClient(ctx.env as unknown as OpenFdaEnv);
        const out = await c.searchDrugApprovals({
          sponsor: args.sponsor, brand: args.brand, generic: args.generic,
          dateFrom: args.date_from, dateTo: args.date_to,
          limit: args.limit ?? 25, skip: args.skip ?? 0,
        });
        return { count: out.length, approvals: out };
      },
    },

    {
      name: "fda_drug_label",
      description:
        "Fetch the FDA-approved drug label for a brand or generic name. Includes indications, dosage, contraindications, warnings, adverse reactions.",
      inputSchema: {
        type: "object",
        properties: { drug_name: { type: "string", description: "Brand or generic, e.g. 'Ozempic' or 'semaglutide'." } },
        required: ["drug_name"],
      },
      handler: async (args, ctx) => {
        const c = new OpenFdaClient(ctx.env as unknown as OpenFdaEnv);
        return await c.getDrugLabel(args.drug_name);
      },
    },

    {
      name: "fda_recall_search",
      description:
        "Search drug, device, or food recall events. Filter by classification (Class I = most serious) and date range. Returns recall number, classification, reason, recalling firm, status.",
      inputSchema: {
        type: "object",
        properties: {
          domain: { type: "string", enum: ["drug", "device", "food"], default: "drug" },
          product_class: { type: "string", enum: ["Class I", "Class II", "Class III"] },
          date_from: { type: "string" },
          date_to: { type: "string" },
          limit: { type: "integer", default: 25, minimum: 1, maximum: 100 },
        },
        required: [],
      },
      handler: async (args, ctx) => {
        const c = new OpenFdaClient(ctx.env as unknown as OpenFdaEnv);
        const out = await c.searchRecalls({
          domain: args.domain ?? "drug",
          productClass: args.product_class,
          dateFrom: args.date_from, dateTo: args.date_to,
          limit: args.limit ?? 25,
        });
        return { count: out.length, recalls: out };
      },
    },

    {
      name: "fda_adverse_events",
      description:
        "Aggregate FDA adverse-event reports (FAERS) for a drug. Deduplicates by safetyreportid (bug fixed in 0.2.1). Returns total reports, unique reaction count, and top 20 reactions by frequency in the requested window.",
      inputSchema: {
        type: "object",
        properties: {
          drug: { type: "string", description: "Generic drug name." },
          date_from: { type: "string" },
          date_to: { type: "string" },
          limit: { type: "integer", default: 100, minimum: 1, maximum: 1000 },
        },
        required: ["drug"],
      },
      handler: async (args, ctx) => {
        const c = new OpenFdaClient(ctx.env as unknown as OpenFdaEnv);
        return await c.adverseEventsAggregate({
          drug: args.drug, dateFrom: args.date_from, dateTo: args.date_to, limit: args.limit ?? 100,
        });
      },
    },

    {
      name: "fda_510k_search",
      description:
        "Search FDA 510(k) device clearances. Premium tool — Team tier or higher.",
      inputSchema: {
        type: "object",
        properties: {
          sponsor: { type: "string" },
          device_name: { type: "string" },
          date_from: { type: "string" },
          date_to: { type: "string" },
          limit: { type: "integer", default: 25 },
        },
        required: [],
      },
      premium: true,
      handler: async (args, ctx) => {
        const c = new OpenFdaClient(ctx.env as unknown as OpenFdaEnv);
        const out = await c.search510k({
          sponsor: args.sponsor, deviceName: args.device_name,
          dateFrom: args.date_from, dateTo: args.date_to, limit: args.limit ?? 25,
        });
        return { count: out.length, devices: out };
      },
    },

    {
      name: "fda_drug_shortages",
      description: "Current FDA-tracked drug-shortage list. Premium tool.",
      inputSchema: { type: "object", properties: {}, required: [] },
      premium: true,
      handler: async (_args, ctx) => {
        const c = new OpenFdaClient(ctx.env as unknown as OpenFdaEnv);
        const out = await c.drugShortages();
        return { count: out.length, shortages: out };
      },
    },
  ];
}
