import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { generationsTable } from "./models";

export const modelYearsTable = pgTable(
  "model_years",
  {
    id: serial("id").primaryKey(),
    generationId: integer("generation_id").notNull().references(() => generationsTable.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    fuelType: text("fuel_type").notNull(),
  },
  (table) => [uniqueIndex("model_years_generation_year_idx").on(table.generationId, table.year)],
);

export const enginesTable = pgTable("engines", {
  id: serial("id").primaryKey(),
  modelYearId: integer("model_year_id").notNull().references(() => modelYearsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  horsepower: integer("horsepower").notNull(),
  fuelType: text("fuel_type").notNull(),
  availability: text("availability").notNull(),
});

export const transmissionsTable = pgTable("transmissions", {
  id: serial("id").primaryKey(),
  modelYearId: integer("model_year_id").notNull().references(() => modelYearsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  gears: text("gears").notNull(),
  availability: text("availability").notNull(),
});

export const trimsTable = pgTable(
  "trims",
  {
    id: serial("id").primaryKey(),
    modelYearId: integer("model_year_id").notNull().references(() => modelYearsTable.id, { onDelete: "cascade" }),
    engineId: integer("engine_id").notNull().references(() => enginesTable.id),
    transmissionId: integer("transmission_id").notNull().references(() => transmissionsTable.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    drivetrain: text("drivetrain").notNull(),
    fuelType: text("fuel_type").notNull(),
    mpgCity: integer("mpg_city"),
    mpgHighway: integer("mpg_highway"),
    mpgCombined: integer("mpg_combined"),
    horsepower: integer("horsepower").notNull(),
    priceUsd: integer("price_usd").notNull(),
    researchRank: integer("research_rank").notNull().default(999),
    imageKey: text("image_key").notNull().default("pickup"),
    isDemo: boolean("is_demo").notNull().default(true),
  },
  (table) => [uniqueIndex("trims_slug_idx").on(table.slug)],
);

export const insertModelYearSchema = createInsertSchema(modelYearsTable).omit({ id: true });
export const insertEngineSchema = createInsertSchema(enginesTable).omit({ id: true });
export const insertTransmissionSchema = createInsertSchema(transmissionsTable).omit({ id: true });
export const insertTrimSchema = createInsertSchema(trimsTable).omit({ id: true });
export type InsertModelYear = z.infer<typeof insertModelYearSchema>;
export type ModelYear = typeof modelYearsTable.$inferSelect;
export type InsertEngine = z.infer<typeof insertEngineSchema>;
export type Engine = typeof enginesTable.$inferSelect;
export type InsertTransmission = z.infer<typeof insertTransmissionSchema>;
export type Transmission = typeof transmissionsTable.$inferSelect;
export type InsertTrim = z.infer<typeof insertTrimSchema>;
export type Trim = typeof trimsTable.$inferSelect;