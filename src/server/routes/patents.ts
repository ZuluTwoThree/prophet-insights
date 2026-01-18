import { Hono } from "hono";
import { z } from "zod";
import { BigQuery } from "@google-cloud/bigquery";
import type { AppEnv } from "../types.js";

type LocalizedText = {
  text?: string;
  language?: string;
};

type BigQuerySearchRecord = {
  publication_number?: string;
  publication_date?: string | number;
  filing_date?: string | number;
  priority_date?: string | number;
  title_localized?: LocalizedText[];
  abstract_localized?: LocalizedText[];
  assignee?: string[];
  inventor?: string[];
  cpc?: Array<Record<string, unknown>>;
  ipc?: Array<Record<string, unknown>>;
  assignee_harmonized?: Array<Record<string, unknown>>;
  inventor_harmonized?: Array<Record<string, unknown>>;
};

const COST_PER_TB_USD = 6.25;
const BYTES_PER_TB = 1_000_000_000_000;

const searchSchema = z.object({
  q: z.string().trim().min(2),
  limit: z.string().optional(),
  dryRun: z.string().optional(),
  maxBytesBilled: z.string().optional(),
});

const patentsRoutes = new Hono<AppEnv>();

function uniqueList(values: string[]) {
  return Array.from(new Set(values));
}

function readString(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

function getString(record: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!record) return undefined;
  for (const key of keys) {
    const value = readString(record[key]);
    if (value) return value;
  }
  return undefined;
}

function splitName(name?: string) {
  if (!name) return { firstName: undefined, lastName: undefined };
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: undefined };
  }
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

function pickLocalizedText(entries?: LocalizedText[]) {
  if (!entries?.length) return undefined;
  const english = entries.find((entry) => (entry.language ?? "").toLowerCase().startsWith("en"));
  return english?.text ?? entries[0]?.text;
}

function toDateString(value?: string | number | Date | null) {
  if (!value) return undefined;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const padded = String(Math.trunc(value)).padStart(8, "0");
    if (!/^\d{8}$/.test(padded)) return undefined;
    return `${padded.slice(0, 4)}-${padded.slice(4, 6)}-${padded.slice(6, 8)}`;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{8}$/.test(trimmed)) {
      return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.slice(0, 10);
    }
  }
  return undefined;
}

function normalizeClassificationCodes(record: BigQuerySearchRecord) {
  const cpcEntries = Array.isArray(record.cpc) ? record.cpc : [];
  const ipcEntries = Array.isArray(record.ipc) ? record.ipc : [];

  const cpcCodes = cpcEntries
    .map((entry) =>
      readString(entry.code) ??
      readString(entry.cpc_subgroup_id) ??
      readString(entry.subgroup_id) ??
      readString(entry.cpc_group_id) ??
      readString(entry.group_id) ??
      readString(entry.cpc_subclass_id) ??
      readString(entry.subclass_id) ??
      readString(entry.cpc_section_id) ??
      readString(entry.section_id) ??
      "",
    )
    .filter(Boolean);

  const ipcCodes = ipcEntries
    .map((entry) =>
      readString(entry.code) ??
      readString(entry.symbol) ??
      readString(entry.ipc_classification_symbol) ??
      readString(entry.ipc_section) ??
      "",
    )
    .filter(Boolean);

  return {
    cpcCodes,
    ipcCodes,
  };
}

function computeScore(queryTokens: string[], title: string, abstract: string) {
  if (!queryTokens.length) return 0.5;
  const haystack = `${title} ${abstract}`.toLowerCase();
  let hits = 0;
  for (const token of queryTokens) {
    if (haystack.includes(token)) hits += 1;
  }
  const ratio = hits / queryTokens.length;
  return Math.min(0.98, Math.max(0.3, 0.3 + ratio * 0.68));
}

function buildHighlights(queryTokens: string[], classifications: string[]) {
  const highlights = uniqueList([...classifications, ...queryTokens]).slice(0, 4);
  return highlights.length ? highlights : ["text match"];
}

function resolveTableId() {
  const dataset = process.env.BIGQUERY_DATASET ?? "patents-public-data.patents";
  const table = process.env.BIGQUERY_TABLE ?? "publications";
  if (dataset.includes(".")) {
    return `${dataset}.${table}`;
  }
  const projectId = process.env.BIGQUERY_PROJECT_ID;
  if (!projectId) {
    return `${dataset}.${table}`;
  }
  return `${projectId}.${dataset}.${table}`;
}

function buildSearchQuery(query: string, limit: number) {
  const pattern = `%${query.toLowerCase()}%`;
  return {
    query: `
      SELECT
        publication_number,
        publication_date,
        filing_date,
        priority_date,
        title_localized,
        abstract_localized,
        assignee,
        inventor,
        cpc,
        ipc,
        assignee_harmonized,
        inventor_harmonized
      FROM \`${resolveTableId()}\`
      WHERE (
        EXISTS (
          SELECT 1
          FROM UNNEST(IFNULL(title_localized, [])) AS t
          WHERE LOWER(t.text) LIKE @pattern
        )
        OR EXISTS (
          SELECT 1
          FROM UNNEST(IFNULL(abstract_localized, [])) AS a
          WHERE LOWER(a.text) LIKE @pattern
        )
      )
      ORDER BY publication_date DESC
      LIMIT @limit
    `,
    params: {
      pattern,
      limit,
    },
  };
}

function estimateCost(bytesProcessed: number) {
  return (bytesProcessed / BYTES_PER_TB) * COST_PER_TB_USD;
}

function extractAssignee(record: BigQuerySearchRecord) {
  const harmonized = Array.isArray(record.assignee_harmonized) ? record.assignee_harmonized : [];
  for (const entry of harmonized) {
    const name = getString(entry, ["name", "organization", "assignee_organization"]);
    if (name) return name;
  }
  const fallback = Array.isArray(record.assignee) ? record.assignee : [];
  return fallback.find((value) => Boolean(readString(value))) ?? "Unknown assignee";
}

function extractInventors(record: BigQuerySearchRecord) {
  const inventors: string[] = [];
  const harmonized = Array.isArray(record.inventor_harmonized) ? record.inventor_harmonized : [];
  for (const entry of harmonized) {
    const firstName = getString(entry, ["first_name", "given_name", "firstName", "inventor_first_name"]);
    const lastName = getString(entry, ["last_name", "family_name", "lastName", "inventor_last_name"]);
    const name = getString(entry, ["name", "name_full", "inventor_name"]);
    const split = splitName(name);
    const resolved = [firstName ?? split.firstName, lastName ?? split.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (resolved) inventors.push(resolved);
  }

  if (inventors.length) {
    return uniqueList(inventors);
  }

  const fallback = Array.isArray(record.inventor) ? record.inventor : [];
  const fallbackList = fallback.map((entry) => readString(entry)).filter(Boolean) as string[];
  return fallbackList.length ? uniqueList(fallbackList) : ["Unknown inventor"];
}

patentsRoutes.get("/search", async (c) => {
  const parsed = searchSchema.safeParse({
    q: c.req.query("q"),
    limit: c.req.query("limit"),
    dryRun: c.req.query("dryRun"),
    maxBytesBilled: c.req.query("maxBytesBilled"),
  });
  if (!parsed.success) {
    return c.json({ error: "Query must be at least 2 characters." }, 400);
  }

  const query = parsed.data.q.trim();
  const limit = Math.min(50, Math.max(1, Number(parsed.data.limit ?? "12") || 12));
  const dryRun = parsed.data.dryRun === "true";
  const maxBytesBilled = parsed.data.maxBytesBilled ? Number(parsed.data.maxBytesBilled) : undefined;

  const bigquery = new BigQuery({
    projectId: process.env.BIGQUERY_PROJECT_ID || undefined,
  });

  const querySpec = buildSearchQuery(query, limit);
  const queryOptions: Record<string, unknown> = {
    query: querySpec.query,
    params: querySpec.params,
    location: process.env.BIGQUERY_LOCATION ?? "US",
    useQueryCache: false,
  };

  if (dryRun) {
    if (Number.isFinite(maxBytesBilled)) {
      queryOptions.maximumBytesBilled = String(Math.trunc(maxBytesBilled));
    }
    queryOptions.dryRun = true;

    const [, metadata] = await bigquery.query(queryOptions);
    const bytesProcessed =
      Number(metadata?.statistics?.totalBytesProcessed ?? 0) ||
      Number(metadata?.statistics?.query?.totalBytesProcessed ?? 0);

    return c.json({
      bytesProcessed,
      estimatedCostUsd: estimateCost(bytesProcessed),
    });
  }

  if (Number.isFinite(maxBytesBilled)) {
    queryOptions.maximumBytesBilled = String(Math.trunc(maxBytesBilled));
  }

  const [rows] = await bigquery.query(queryOptions);
  const results: Array<{
    patent: {
      id: string;
      title: string;
      abstract: string;
      publicationDate: string;
      assignee: string;
      inventors: string[];
      classifications: string[];
      citationCount: number;
      backwardCitations: string[];
      forwardCitations: string[];
      domain: string;
    };
    score: number;
    highlights: string[];
  }> = [];

  const queryTokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);

  for (const row of rows as BigQuerySearchRecord[]) {
    if (!row.publication_number) continue;
    const title = pickLocalizedText(row.title_localized) ?? "Untitled patent";
    const abstract = pickLocalizedText(row.abstract_localized) ?? "";
    const publicationDate =
      toDateString(row.publication_date ?? null) ??
      toDateString(row.filing_date ?? null) ??
      toDateString(row.priority_date ?? null) ??
      "Unknown";
    const assignee = extractAssignee(row);
    const inventors = extractInventors(row);
    const { cpcCodes, ipcCodes } = normalizeClassificationCodes(row);
    const classificationList = uniqueList([...cpcCodes, ...ipcCodes]);

    results.push({
      patent: {
        id: row.publication_number,
        title,
        abstract,
        publicationDate,
        assignee,
        inventors,
        classifications: classificationList,
        citationCount: 0,
        backwardCitations: [],
        forwardCitations: [],
        domain: "General",
      },
      score: computeScore(queryTokens, title, abstract),
      highlights: buildHighlights(queryTokens, classificationList),
    });
  }

  return c.json({ results });
});

export { patentsRoutes };
