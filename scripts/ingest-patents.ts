#!/usr/bin/env node
import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import { BigQuery } from "@google-cloud/bigquery";
import { db, client } from "../src/server/db/client";
import {
  assignees,
  citations,
  classifications,
  inventors,
  patentAssignees,
  patentClassifications,
  patentInventors,
  patents,
} from "../src/server/db/schema";

type LocalizedText = {
  text?: string;
  language?: string;
};

type BigQueryPatentRecord = {
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
  citation?: Array<Record<string, unknown>>;
};

type NormalizedPatent = {
  id: string;
  title?: string;
  abstract?: string;
  claims?: string;
  ipcCodes: string[];
  cpcCodes: string[];
  publicationDate?: string;
  priorityDate?: string;
  filingDate?: string;
  assignees: Array<{
    id: string;
    name: string;
    country?: string;
    state?: string;
    city?: string;
  }>;
  inventors: Array<{
    id: string;
    firstName?: string;
    lastName?: string;
    country?: string;
    state?: string;
    city?: string;
  }>;
  classifications: Array<{ code: string; scheme: "ipc" | "cpc"; description?: string }>;
  citations: Array<{ citedPatentId?: string; type?: string }>;
};

function parseArgs() {
  const defaults = {
    limit: 50,
    pageSize: 25,
    startDate: "2024-01-01",
    endDate: undefined as string | undefined,
    sourceFile: undefined as string | undefined,
    includeCitations: false,
    dryRun: false,
    maxBytesBilled: undefined as number | undefined,
  };

  const parsed: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    const normalized = arg.replace(/^--/, "");
    if (!normalized) continue;
    const eqIndex = normalized.indexOf("=");
    if (eqIndex === -1) {
      parsed[normalized] = "true";
      continue;
    }
    const key = normalized.slice(0, eqIndex);
    const value = normalized.slice(eqIndex + 1);
    if (key) parsed[key] = value;
  }

  return {
    limit: Number(parsed.limit ?? defaults.limit),
    pageSize: Number(parsed.pageSize ?? defaults.pageSize),
    startDate: parsed.startDate ?? defaults.startDate,
    endDate: parsed.endDate ?? defaults.endDate,
    sourceFile: parsed.sourceFile ?? defaults.sourceFile,
    includeCitations: parsed.includeCitations === "true" ? true : defaults.includeCitations,
    dryRun: parsed.dryRun === "true" ? true : defaults.dryRun,
    maxBytesBilled: parsed.maxBytesBilled ? Number(parsed.maxBytesBilled) : defaults.maxBytesBilled,
  };
}

async function readLocalSource(path: string) {
  const buffer = await fs.readFile(path, "utf8");
  const data = JSON.parse(buffer);
  if (!Array.isArray(data)) {
    throw new Error("Local source file must contain an array of BigQuery patent objects");
  }
  return data as BigQueryPatentRecord[];
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

type Cursor = {
  date: number;
  publicationNumber: string;
};

type QuerySpec = {
  query: string;
  params: Record<string, string | number>;
};

function buildQuerySpec(options: {
  perPage: number;
  startDate?: string;
  endDate?: string;
  includeCitations: boolean;
  cursor?: Cursor;
}): QuerySpec {
  const startDateInt = toDateInt(options.startDate);
  const endDateInt = toDateInt(options.endDate);

  const fields = [
    "publication_number",
    "publication_date",
    "filing_date",
    "priority_date",
    "title_localized",
    "abstract_localized",
    "assignee",
    "inventor",
    "cpc",
    "ipc",
    "assignee_harmonized",
    "inventor_harmonized",
  ];

  if (options.includeCitations) {
    fields.push("citation");
  }

  const whereParts: string[] = [];
  const params: Record<string, string | number> = {
    limit: options.perPage,
  };

  if (startDateInt) {
    whereParts.push("publication_date >= @startDate");
    params.startDate = startDateInt;
  }

  if (endDateInt) {
    whereParts.push("publication_date <= @endDate");
    params.endDate = endDateInt;
  }

  if (options.cursor) {
    whereParts.push(
      "(publication_date > @cursorDate OR (publication_date = @cursorDate AND publication_number > @cursorNumber))",
    );
    params.cursorDate = options.cursor.date;
    params.cursorNumber = options.cursor.publicationNumber;
  }

  const whereClause = whereParts.length ? whereParts.join(" AND ") : "1=1";

  return {
    query: `
    SELECT
      ${fields.join(",\n      ")}
    FROM \`${resolveTableId()}\`
    WHERE ${whereClause}
    ORDER BY publication_date ASC, publication_number ASC
    LIMIT @limit
  `,
    params,
  };
}

function buildQueryOptions(
  querySpec: QuerySpec,
  options?: { maxBytesBilled?: number; dryRun?: boolean },
) {
  const queryOptions: Record<string, unknown> = {
    query: querySpec.query,
    params: querySpec.params,
    location: process.env.BIGQUERY_LOCATION ?? "US",
    useQueryCache: false,
  };

  if (options?.maxBytesBilled && Number.isFinite(options.maxBytesBilled)) {
    queryOptions.maximumBytesBilled = String(Math.trunc(options.maxBytesBilled));
  }

  if (options?.dryRun) {
    queryOptions.dryRun = true;
  }

  return queryOptions;
}

async function fetchFromBigQuery(
  perPage: number,
  startDate: string | undefined,
  endDate: string | undefined,
  includeCitations: boolean,
  cursor: Cursor | undefined,
  maxBytesBilled: number | undefined,
): Promise<BigQueryPatentRecord[]> {
  const bigquery = new BigQuery({
    projectId: process.env.BIGQUERY_PROJECT_ID || undefined,
  });

  const querySpec = buildQuerySpec({
    perPage,
    startDate,
    endDate,
    includeCitations,
    cursor,
  });
  const options = buildQueryOptions(querySpec, { maxBytesBilled });
  const [rows] = await bigquery.query(options);
  return rows as BigQueryPatentRecord[];
}

async function estimateQueryBytes(options: {
  perPage: number;
  startDate?: string;
  endDate?: string;
  includeCitations: boolean;
  cursor?: Cursor;
  maxBytesBilled?: number;
}) {
  const bigquery = new BigQuery({
    projectId: process.env.BIGQUERY_PROJECT_ID || undefined,
  });

  const querySpec = buildQuerySpec(options);
  const queryOptions = buildQueryOptions(querySpec, {
    maxBytesBilled: options.maxBytesBilled,
    dryRun: true,
  });

  const [, metadata] = await bigquery.query(queryOptions);
  const bytes =
    Number(metadata?.statistics?.totalBytesProcessed ?? 0) ||
    Number(metadata?.statistics?.query?.totalBytesProcessed ?? 0);

  return bytes;
}

function pickLocalizedText(entries?: LocalizedText[]) {
  if (!entries?.length) return undefined;
  const english = entries.find((entry) => (entry.language ?? "").toLowerCase().startsWith("en"));
  return english?.text ?? entries[0]?.text;
}

function readString(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

function stableId(prefix: string, value: string) {
  const digest = crypto.createHash("sha1").update(value).digest("hex");
  return `${prefix}_${digest}`;
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

function normalizeAssigneeName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return null;
  return {
    id: stableId("assignee", trimmed),
    name: trimmed,
  };
}

function normalizeInventorName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const split = splitName(trimmed);
  if (!split.firstName && !split.lastName) return null;
  return {
    id: stableId("inventor", trimmed),
    firstName: split.firstName,
    lastName: split.lastName,
  };
}

function toDateInt(value?: string) {
  if (!value) return undefined;
  const cleaned = value.replace(/-/g, "");
  if (!/^\d{8}$/.test(cleaned)) return undefined;
  return Number(cleaned);
}

function toDateIntFromValue(value?: string | number | Date | null) {
  const dateString = toDateString(value);
  if (!dateString) return undefined;
  return toDateInt(dateString);
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

function normalizeClassificationCodes(record: BigQueryPatentRecord) {
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

function normalizeBigQueryPatent(record: BigQueryPatentRecord): NormalizedPatent | null {
  const id = record.publication_number;
  if (!id) return null;

  const { cpcCodes, ipcCodes } = normalizeClassificationCodes(record);
  const title = pickLocalizedText(record.title_localized);
  const abstract = pickLocalizedText(record.abstract_localized);

  const assigneeEntries = Array.isArray(record.assignee_harmonized) ? record.assignee_harmonized : [];
  const inventorEntries = Array.isArray(record.inventor_harmonized) ? record.inventor_harmonized : [];
  const citationEntries = Array.isArray(record.citation) ? record.citation : [];
  const cpcEntries = Array.isArray(record.cpc) ? record.cpc : [];
  const assigneeNames = Array.isArray(record.assignee) ? record.assignee : [];
  const inventorNames = Array.isArray(record.inventor) ? record.inventor : [];

  const harmonizedAssignees = assigneeEntries.flatMap((assignee) => {
    const name = getString(assignee, ["name", "organization", "assignee_organization"]);
    if (!name) return [];
    const idValue = getString(assignee, ["assignee_id", "id"]) ?? stableId("assignee", name);
    return [
      {
        id: idValue,
        name,
        country: getString(assignee, ["country_code", "country"]),
        state: getString(assignee, ["state", "region"]),
        city: getString(assignee, ["city"]),
      },
    ];
  });

  const fallbackAssignees = assigneeNames
    .map((name) => normalizeAssigneeName(name))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const harmonizedInventors = inventorEntries.flatMap((inventor) => {
    const firstName =
      getString(inventor, ["first_name", "given_name", "firstName", "inventor_first_name"]) ?? undefined;
    const lastName =
      getString(inventor, ["last_name", "family_name", "lastName", "inventor_last_name"]) ?? undefined;
    const name = getString(inventor, ["name", "name_full", "inventor_name"]);
    const split = splitName(name);
    const resolvedFirst = firstName ?? split.firstName;
    const resolvedLast = lastName ?? split.lastName;
    if (!resolvedFirst && !resolvedLast) return [];
    const fallbackName = [resolvedFirst, resolvedLast].filter(Boolean).join(" ").trim();
    return [
      {
        id:
          getString(inventor, ["inventor_id", "id"]) ??
          stableId("inventor", name ?? fallbackName),
        firstName: resolvedFirst,
        lastName: resolvedLast,
        country: getString(inventor, ["country_code", "country"]),
        state: getString(inventor, ["state", "region"]),
        city: getString(inventor, ["city"]),
      },
    ];
  });

  const fallbackInventors = inventorNames
    .map((name) => normalizeInventorName(name))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  return {
    id,
    title,
    abstract,
    claims: undefined,
    ipcCodes,
    cpcCodes,
    publicationDate: toDateString(record.publication_date ?? null),
    priorityDate: toDateString(record.priority_date ?? null),
    filingDate: toDateString(record.filing_date ?? null),
    assignees: harmonizedAssignees.length ? harmonizedAssignees : fallbackAssignees,
    inventors: harmonizedInventors.length ? harmonizedInventors : fallbackInventors,
    classifications: [
      ...ipcCodes.map((code) => ({ code, scheme: "ipc" as const, description: undefined })),
      ...cpcCodes.map((code) => {
        const entry = cpcEntries.find((cpc) =>
          [
            cpc.code,
            cpc.cpc_subgroup_id,
            cpc.subgroup_id,
            cpc.cpc_group_id,
            cpc.group_id,
            cpc.cpc_subclass_id,
            cpc.subclass_id,
            cpc.cpc_section_id,
            cpc.section_id,
          ]
            .map(readString)
            .includes(code),
        );
        return {
          code,
          scheme: "cpc" as const,
          description:
            getString(entry, ["title", "description", "cpc_subgroup_title"]) ?? undefined,
        };
      }),
    ],
    citations: citationEntries.map((citation) => ({
      citedPatentId:
        getString(citation, [
          "publication_number",
          "cited_publication_number",
          "cited_patent_number",
          "citation_publication_number",
        ]) ?? undefined,
      type: getString(citation, ["category", "citation_category", "citation_type"]) ?? undefined,
    })),
  };
}

async function upsertPatents(patentBatch: NormalizedPatent[]) {
  for (const patent of patentBatch) {
    await db
      .insert(patents)
      .values({
        id: patent.id,
        title: patent.title,
        abstract: patent.abstract,
        claims: patent.claims,
        ipc: patent.ipcCodes.join(", "),
        cpc: patent.cpcCodes.join(", "),
        publicationDate: patent.publicationDate ?? null,
        priorityDate: patent.priorityDate ?? null,
        filingDate: patent.filingDate ?? null,
      })
      .onConflictDoUpdate({
        target: patents.id,
        set: {
          title: patent.title,
          abstract: patent.abstract,
          claims: patent.claims,
          ipc: patent.ipcCodes.join(", "),
          cpc: patent.cpcCodes.join(", "),
          publicationDate: patent.publicationDate ?? null,
          priorityDate: patent.priorityDate ?? null,
          filingDate: patent.filingDate ?? null,
          updatedAt: new Date(),
        },
      });

    if (patent.assignees.length) {
      for (const assignee of patent.assignees) {
        await db
          .insert(assignees)
          .values({
            id: assignee.id,
            name: assignee.name,
            country: assignee.country ?? null,
            city: assignee.city ?? null,
            state: assignee.state ?? null,
          })
          .onConflictDoUpdate({
            target: assignees.id,
            set: {
              name: assignee.name,
              country: assignee.country ?? null,
              city: assignee.city ?? null,
              state: assignee.state ?? null,
              updatedAt: new Date(),
            },
          });
      }

      await db
        .insert(patentAssignees)
        .values(patent.assignees.map((assignee) => ({ patentId: patent.id, assigneeId: assignee.id })))
        .onConflictDoNothing();
    }

    if (patent.inventors.length) {
      for (const inventor of patent.inventors) {
        await db
          .insert(inventors)
          .values({
            id: inventor.id,
            firstName: inventor.firstName ?? null,
            lastName: inventor.lastName ?? null,
            country: inventor.country ?? null,
            city: inventor.city ?? null,
            state: inventor.state ?? null,
          })
          .onConflictDoUpdate({
            target: inventors.id,
            set: {
              firstName: inventor.firstName ?? null,
              lastName: inventor.lastName ?? null,
              country: inventor.country ?? null,
              city: inventor.city ?? null,
              state: inventor.state ?? null,
              updatedAt: new Date(),
            },
          });
      }

      await db
        .insert(patentInventors)
        .values(patent.inventors.map((inventor) => ({ patentId: patent.id, inventorId: inventor.id })))
        .onConflictDoNothing();
    }

    if (patent.classifications.length) {
      const classificationIds = [];
      for (const classification of patent.classifications) {
        const [record] = await db
          .insert(classifications)
          .values({
            code: classification.code,
            scheme: classification.scheme,
            description: classification.description ?? null,
          })
          .onConflictDoUpdate({
            target: [classifications.code, classifications.scheme],
            set: {
              description: classification.description ?? null,
              updatedAt: new Date(),
            },
          })
          .returning({ id: classifications.id });

        if (record?.id) {
          classificationIds.push(record.id);
        }
      }

      if (classificationIds.length) {
        await db
          .insert(patentClassifications)
          .values(
            classificationIds.map((classificationId) => ({
              patentId: patent.id,
              classificationId,
            })),
          )
          .onConflictDoNothing();
      }
    }

    if (patent.citations.length) {
      await db
        .insert(citations)
        .values(
          patent.citations.map((citation) => ({
            patentId: patent.id,
            citedPatentId: citation.citedPatentId ?? null,
            citationType: citation.type ?? null,
          })),
        )
        .onConflictDoNothing({
          target: [citations.patentId, citations.citedPatentId, citations.citationType],
        });
    }
  }
}

async function main() {
  const args = parseArgs();
  const batches: BigQueryPatentRecord[][] = [];

  if (args.sourceFile) {
    batches.push(await readLocalSource(args.sourceFile));
  } else {
    if (args.dryRun) {
      const bytes = await estimateQueryBytes({
        perPage: args.pageSize,
        startDate: args.startDate,
        endDate: args.endDate,
        includeCitations: args.includeCitations,
        maxBytesBilled: args.maxBytesBilled,
      });
      const gib = bytes / 1024 ** 3;
      console.log(`Dry run estimate: ${bytes} bytes (${gib.toFixed(2)} GiB)`);
      return;
    }

    let fetched = 0;
    let cursor: Cursor | undefined;
    while (fetched < args.limit) {
      const rows = await fetchFromBigQuery(
        args.pageSize,
        args.startDate,
        args.endDate,
        args.includeCitations,
        cursor,
        args.maxBytesBilled,
      );
      if (!rows.length) break;
      const remaining = args.limit - fetched;
      const batch = rows.slice(0, remaining);
      batches.push(batch);
      fetched += batch.length;

      const last = batch[batch.length - 1];
      const lastDate = toDateIntFromValue(last?.publication_date ?? null);
      if (!lastDate || !last?.publication_number) {
        break;
      }
      cursor = { date: lastDate, publicationNumber: last.publication_number };
    }
  }

  const normalized: NormalizedPatent[] = [];
  for (const batch of batches) {
    for (const record of batch) {
      const item = normalizeBigQueryPatent(record);
      if (item) normalized.push(item);
    }
  }

  if (!normalized.length) {
    console.warn("No patent records to ingest. Exiting.");
    return;
  }

  console.log(`Ingesting ${normalized.length} patents...`);
  await upsertPatents(normalized);
  console.log("Ingest complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
