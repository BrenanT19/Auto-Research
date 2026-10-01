import { integer, pgTable, serial, text, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { makesTable } from "./makes";

export const modelsTable = pgTable(
  "models",
  {
    id: serial("id").primaryKey(),
    makeId: integer("make_id").notNull().references(() => makesTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
  },
  (table) => [uniqueIndex("models_make_slug_idx").on(table.makeId, table.slug)],
);

export const generationsTable = pgTable(
  "generations",
  {
    id: serial("id").primaryKey(),
    modelId: integer("model_id").notNull().references(() => modelsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    startYear: integer("start_year").notNull(),
    endYear: integer("end_year"),
    bodyType: text("body_type").notNull(),
  },
  (table) => [uniqueIndex("generations_model_year_idx").on(table.modelId, table.startYear)],
);

export const insertModelSchema = createInsertSchema(modelsTable).omit({ id: true });
export const insertGenerationSchema = createInsertSchema(generationsTable).omit({ id: true });
export type InsertModel = z.infer<typeof insertModelSchema>;
export type Model = typeof modelsTable.$inferSelect;
export type InsertGeneration = z.infer<typeof insertGenerationSchema>;
export type Generation = typeof generationsTable.$inferSelect;