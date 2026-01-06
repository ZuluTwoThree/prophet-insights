import {
  boolean,
  date,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  hashedPassword: text("hashed_password"),
  name: text("name"),
  emailVerified: boolean("email_verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const oauthAccounts = pgTable(
  "oauth_account",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerUserId: text("provider_user_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => ({
    providerUserIdIdx: uniqueIndex("oauth_provider_user_idx").on(
      table.provider,
      table.providerUserId,
    ),
  }),
);

export const patents = pgTable("patent", {
  id: text("id").primaryKey(),
  title: text("title"),
  abstract: text("abstract"),
  claims: text("claims"),
  ipc: text("ipc"),
  cpc: text("cpc"),
  priorityDate: date("priority_date"),
  filingDate: date("filing_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const assignees = pgTable(
  "assignee",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    country: text("country"),
    city: text("city"),
    state: text("state"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    assigneeNameIdx: uniqueIndex("assignee_name_idx").on(table.name),
  }),
);

export const inventors = pgTable(
  "inventor",
  {
    id: text("id").primaryKey(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    country: text("country"),
    city: text("city"),
    state: text("state"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    inventorNameIdx: uniqueIndex("inventor_name_idx").on(table.firstName, table.lastName),
  }),
);

export const classifications = pgTable(
  "classification",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    code: text("code").notNull(),
    scheme: text("scheme").notNull(), // ipc or cpc
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    classificationCodeIdx: uniqueIndex("classification_code_idx").on(table.code, table.scheme),
  }),
);

export const patentClassifications = pgTable(
  "patent_classification",
  {
    patentId: text("patent_id")
      .notNull()
      .references(() => patents.id, { onDelete: "cascade" }),
    classificationId: integer("classification_id")
      .notNull()
      .references(() => classifications.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.patentId, table.classificationId] }),
  }),
);

export const patentAssignees = pgTable(
  "patent_assignee",
  {
    patentId: text("patent_id")
      .notNull()
      .references(() => patents.id, { onDelete: "cascade" }),
    assigneeId: text("assignee_id")
      .notNull()
      .references(() => assignees.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.patentId, table.assigneeId] }),
  }),
);

export const patentInventors = pgTable(
  "patent_inventor",
  {
    patentId: text("patent_id")
      .notNull()
      .references(() => patents.id, { onDelete: "cascade" }),
    inventorId: text("inventor_id")
      .notNull()
      .references(() => inventors.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.patentId, table.inventorId] }),
  }),
);

export const citations = pgTable(
  "citation",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    patentId: text("patent_id")
      .notNull()
      .references(() => patents.id, { onDelete: "cascade" }),
    citedPatentId: text("cited_patent_id"),
    citationType: text("citation_type"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    citationUniqueIdx: uniqueIndex("citation_unique_idx").on(
      table.patentId,
      table.citedPatentId,
      table.citationType,
    ),
  }),
);
