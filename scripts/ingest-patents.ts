#!/usr/bin/env node
import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs/promises";
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

type PatentApiRecord = {
  patent_number: string;
  patent_title?: string;
  patent_abstract?: string;
  patent_date?: string;
  app_date?: string;
  priority_date?: string;
  cpcs?: Array<{
    cpc_subgroup_id?: string;
    cpc_group_id?: string;
    cpc_subclass_id?: string;
    cpc_section_id?: string;
    cpc_subgroup_title?: string;
  }>;
  ipcs?: Array<{
    ipc_classification_symbol?: string;
    ipc_section?: string;
    ipc_class?: string;
    ipc_main_group?: string;
    ipc_subgroup?: string;
  }>;
  assignees?: Array<{
    assignee_id?: string;
    assignee_organization?: string;
    assignee_lastknown_country?: string;
    assignee_lastknown_state?: string;
    assignee_lastknown_city?: string;
  }>;
  inventors?: Array<{
    inventor_id?: string;
    inventor_first_name?: string;
    inventor_last_name?: string;
    inventor_country?: string;
    inventor_state?: string;
    inventor_city?: string;
  }>;
  cited_patents?: Array<{
    cited_patent_number?: string;
    citation_category?: string;
  }>;
};

type NormalizedPatent = {
  id: string;
  title?: string;
  abstract?: string;
  claims?: string;
  ipcCodes: string[];
  cpcCodes: string[];
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
    sourceFile: undefined as string | undefined,
  };

  const parsed: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    if (key && value) parsed[key] = value;
  }

  return {
    limit: Number(parsed.limit ?? defaults.limit),
    pageSize: Number(parsed.pageSize ?? defaults.pageSize),
    startDate: parsed.startDate ?? defaults.startDate,
    sourceFile: parsed.sourceFile ?? defaults.sourceFile,
  };
}

async function readLocalSource(path: string) {
  const buffer = await fs.readFile(path, "utf8");
  const data = JSON.parse(buffer);
  if (!Array.isArray(data)) {
    throw new Error("Local source file must contain an array of patent objects");
  }
  return data as PatentApiRecord[];
}

async function fetchFromPatentsView(
  page: number,
  perPage: number,
  startDate?: string,
): Promise<PatentApiRecord[]> {
  const body = {
    q: startDate ? { _gte: { patent_date: startDate } } : {},
    f: [
      "patent_number",
      "patent_title",
      "patent_abstract",
      "patent_date",
      "app_date",
      "priority_date",
    ],
    o: { page, per_page: perPage },
    include_subentity_total_counts: false,
    include: ["assignees", "inventors", "cpcs", "ipcs", "cited_patents"],
  };

  const response = await fetch("https://api.patentsview.org/patents/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch patents: ${response.status} ${text}`);
  }

  const payload = (await response.json()) as { patents?: PatentApiRecord[] };
  return payload.patents ?? [];
}

function normalizeClassificationCodes(record: PatentApiRecord) {
  const cpcCodes =
    record.cpcs?.map(
      (cpc) =>
        cpc.cpc_subgroup_id ??
        cpc.cpc_group_id ??
        cpc.cpc_subclass_id ??
        cpc.cpc_section_id ??
        "",
    ) ?? [];

  const ipcCodes =
    record.ipcs?.map((ipc) => ipc.ipc_classification_symbol ?? ipc.ipc_section ?? "").filter(Boolean) ??
    [];

  return {
    cpcCodes: cpcCodes.filter(Boolean),
    ipcCodes,
  };
}

function normalizePatent(record: PatentApiRecord): NormalizedPatent | null {
  if (!record.patent_number) return null;

  const { cpcCodes, ipcCodes } = normalizeClassificationCodes(record);

  return {
    id: record.patent_number,
    title: record.patent_title,
    abstract: record.patent_abstract,
    claims: undefined,
    ipcCodes,
    cpcCodes,
    priorityDate: record.priority_date ?? undefined,
    filingDate: record.app_date ?? undefined,
    assignees:
      record.assignees?.flatMap((assignee) => {
        if (!assignee.assignee_id && !assignee.assignee_organization) return [];
        return [
          {
            id: assignee.assignee_id ?? assignee.assignee_organization ?? crypto.randomUUID(),
            name: assignee.assignee_organization ?? "Unknown Assignee",
            country: assignee.assignee_lastknown_country ?? undefined,
            state: assignee.assignee_lastknown_state ?? undefined,
            city: assignee.assignee_lastknown_city ?? undefined,
          },
        ];
      }) ?? [],
    inventors:
      record.inventors?.flatMap((inventor) => {
        if (!inventor.inventor_id && !inventor.inventor_last_name) return [];
        return [
          {
            id: inventor.inventor_id ?? crypto.randomUUID(),
            firstName: inventor.inventor_first_name ?? undefined,
            lastName: inventor.inventor_last_name ?? undefined,
            country: inventor.inventor_country ?? undefined,
            state: inventor.inventor_state ?? undefined,
            city: inventor.inventor_city ?? undefined,
          },
        ];
      }) ?? [],
    classifications: [
      ...ipcCodes.map((code) => ({ code, scheme: "ipc" as const, description: undefined })),
      ...cpcCodes.map((code) => ({
        code,
        scheme: "cpc" as const,
        description:
          record.cpcs?.find(
            (cpc) =>
              code ===
              (cpc.cpc_subgroup_id ??
                cpc.cpc_group_id ??
                cpc.cpc_subclass_id ??
                cpc.cpc_section_id),
          )?.cpc_subgroup_title ?? undefined,
      })),
    ],
    citations:
      record.cited_patents?.map((citation) => ({
        citedPatentId: citation.cited_patent_number ?? undefined,
        type: citation.citation_category ?? undefined,
      })) ?? [],
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
        priorityDate: patent.priorityDate ? new Date(patent.priorityDate) : null,
        filingDate: patent.filingDate ? new Date(patent.filingDate) : null,
      })
      .onConflictDoUpdate({
        target: patents.id,
        set: {
          title: patent.title,
          abstract: patent.abstract,
          claims: patent.claims,
          ipc: patent.ipcCodes.join(", "),
          cpc: patent.cpcCodes.join(", "),
          priorityDate: patent.priorityDate ? new Date(patent.priorityDate) : null,
          filingDate: patent.filingDate ? new Date(patent.filingDate) : null,
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
  const batches: PatentApiRecord[][] = [];

  if (args.sourceFile) {
    batches.push(await readLocalSource(args.sourceFile));
  } else {
    let fetched = 0;
    let page = 1;
    while (fetched < args.limit) {
      try {
        const patents = await fetchFromPatentsView(page, args.pageSize, args.startDate);
        if (!patents.length) break;
        batches.push(patents);
        fetched += patents.length;
        page += 1;
      } catch (error) {
        console.error("Network ingest failed; rethrowing for visibility.", error);
        throw error;
      }
    }
  }

  const normalized: NormalizedPatent[] = [];
  for (const batch of batches) {
    for (const record of batch) {
      const item = normalizePatent(record);
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
