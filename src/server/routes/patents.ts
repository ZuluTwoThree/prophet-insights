import { Hono } from "hono";
import { z } from "zod";
import { desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  assignees,
  citations,
  classifications,
  inventors,
  patentAssignees,
  patentClassifications,
  patentInventors,
  patents,
} from "../db/schema.js";
import type { AppEnv } from "../types.js";

const searchSchema = z.object({
  q: z.string().trim().min(2),
  limit: z.string().optional(),
});

const patentsRoutes = new Hono<AppEnv>();

function uniqueList(values: string[]) {
  return Array.from(new Set(values));
}

function formatDate(value?: string | Date | null) {
  if (!value) return "Unknown";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value;
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

patentsRoutes.get("/search", async (c) => {
  const parsed = searchSchema.safeParse({
    q: c.req.query("q"),
    limit: c.req.query("limit"),
  });
  if (!parsed.success) {
    return c.json({ error: "Query must be at least 2 characters." }, 400);
  }

  const query = parsed.data.q.trim();
  const limit = Math.min(50, Math.max(1, Number(parsed.data.limit ?? "12") || 12));
  const pattern = `%${query}%`;

  const patentRows = await db
    .select({
      id: patents.id,
      title: patents.title,
      abstract: patents.abstract,
      publicationDate: patents.publicationDate,
      priorityDate: patents.priorityDate,
      filingDate: patents.filingDate,
      updatedAt: patents.updatedAt,
    })
    .from(patents)
    .where(or(ilike(patents.title, pattern), ilike(patents.abstract, pattern)))
    .orderBy(desc(patents.updatedAt))
    .limit(limit);

  if (!patentRows.length) {
    return c.json({ results: [] });
  }

  const patentIds = patentRows.map((row) => row.id);

  const [assigneeRows, inventorRows, classificationRows, citationRows] = await Promise.all([
    db
      .select({
        patentId: patentAssignees.patentId,
        name: assignees.name,
      })
      .from(patentAssignees)
      .innerJoin(assignees, eq(patentAssignees.assigneeId, assignees.id))
      .where(inArray(patentAssignees.patentId, patentIds)),
    db
      .select({
        patentId: patentInventors.patentId,
        firstName: inventors.firstName,
        lastName: inventors.lastName,
      })
      .from(patentInventors)
      .innerJoin(inventors, eq(patentInventors.inventorId, inventors.id))
      .where(inArray(patentInventors.patentId, patentIds)),
    db
      .select({
        patentId: patentClassifications.patentId,
        code: classifications.code,
      })
      .from(patentClassifications)
      .innerJoin(classifications, eq(patentClassifications.classificationId, classifications.id))
      .where(inArray(patentClassifications.patentId, patentIds)),
    db
      .select({
        patentId: citations.patentId,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(citations)
      .where(inArray(citations.patentId, patentIds))
      .groupBy(citations.patentId),
  ]);

  const assigneesByPatent = new Map<string, string[]>();
  for (const row of assigneeRows) {
    const list = assigneesByPatent.get(row.patentId) ?? [];
    list.push(row.name);
    assigneesByPatent.set(row.patentId, list);
  }

  const inventorsByPatent = new Map<string, string[]>();
  for (const row of inventorRows) {
    const list = inventorsByPatent.get(row.patentId) ?? [];
    const name = [row.firstName, row.lastName].filter(Boolean).join(" ").trim();
    if (name) {
      list.push(name);
      inventorsByPatent.set(row.patentId, list);
    }
  }

  const classificationsByPatent = new Map<string, string[]>();
  for (const row of classificationRows) {
    const list = classificationsByPatent.get(row.patentId) ?? [];
    list.push(row.code);
    classificationsByPatent.set(row.patentId, list);
  }

  const citationCountByPatent = new Map<string, number>();
  for (const row of citationRows) {
    citationCountByPatent.set(row.patentId, Number(row.count ?? 0));
  }

  const queryTokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);

  const results = patentRows.map((row) => {
    const title = row.title ?? "Untitled patent";
    const abstract = row.abstract ?? "";
    const assigneeList = uniqueList(assigneesByPatent.get(row.id) ?? []);
    const inventorList = uniqueList(inventorsByPatent.get(row.id) ?? []);
    const classificationList = uniqueList(classificationsByPatent.get(row.id) ?? []);
    const citationCount = citationCountByPatent.get(row.id) ?? 0;
    const publicationDate = formatDate(
      row.publicationDate ?? row.filingDate ?? row.priorityDate ?? row.updatedAt,
    );

    return {
      patent: {
        id: row.id,
        title,
        abstract,
        publicationDate,
        assignee: assigneeList[0] ?? "Unknown assignee",
        inventors: inventorList.length ? inventorList : ["Unknown inventor"],
        classifications: classificationList,
        citationCount,
        backwardCitations: [],
        forwardCitations: [],
        domain: "General",
      },
      score: computeScore(queryTokens, title, abstract),
      highlights: buildHighlights(queryTokens, classificationList),
    };
  });

  return c.json({ results });
});

export { patentsRoutes };
