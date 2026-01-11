CREATE TABLE IF NOT EXISTS "patent" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text,
	"abstract" text,
	"claims" text,
	"ipc" text,
	"cpc" text,
	"publication_date" date,
	"priority_date" date,
	"filing_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assignee" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"country" text,
	"city" text,
	"state" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventor" (
	"id" text PRIMARY KEY NOT NULL,
	"first_name" text,
	"last_name" text,
	"country" text,
	"city" text,
	"state" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "classification" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"code" text NOT NULL,
	"scheme" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patent_classification" (
	"patent_id" text NOT NULL,
	"classification_id" integer NOT NULL,
	CONSTRAINT "patent_classification_patent_id_classification_id_pk" PRIMARY KEY("patent_id","classification_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patent_assignee" (
	"patent_id" text NOT NULL,
	"assignee_id" text NOT NULL,
	CONSTRAINT "patent_assignee_patent_id_assignee_id_pk" PRIMARY KEY("patent_id","assignee_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patent_inventor" (
	"patent_id" text NOT NULL,
	"inventor_id" text NOT NULL,
	CONSTRAINT "patent_inventor_patent_id_inventor_id_pk" PRIMARY KEY("patent_id","inventor_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "citation" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"patent_id" text NOT NULL,
	"cited_patent_id" text,
	"citation_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patent_classification" ADD CONSTRAINT "patent_classification_patent_id_patent_id_fk" FOREIGN KEY ("patent_id") REFERENCES "public"."patent"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patent_classification" ADD CONSTRAINT "patent_classification_classification_id_classification_id_fk" FOREIGN KEY ("classification_id") REFERENCES "public"."classification"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patent_assignee" ADD CONSTRAINT "patent_assignee_patent_id_patent_id_fk" FOREIGN KEY ("patent_id") REFERENCES "public"."patent"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patent_assignee" ADD CONSTRAINT "patent_assignee_assignee_id_assignee_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."assignee"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patent_inventor" ADD CONSTRAINT "patent_inventor_patent_id_patent_id_fk" FOREIGN KEY ("patent_id") REFERENCES "public"."patent"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patent_inventor" ADD CONSTRAINT "patent_inventor_inventor_id_inventor_id_fk" FOREIGN KEY ("inventor_id") REFERENCES "public"."inventor"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "citation" ADD CONSTRAINT "citation_patent_id_patent_id_fk" FOREIGN KEY ("patent_id") REFERENCES "public"."patent"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "assignee_name_idx" ON "assignee" USING btree ("name");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inventor_name_idx" ON "inventor" USING btree ("first_name","last_name");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "classification_code_idx" ON "classification" USING btree ("code","scheme");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "citation_unique_idx" ON "citation" USING btree ("patent_id","cited_patent_id","citation_type");
