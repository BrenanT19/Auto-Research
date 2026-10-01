import { boolean, date, integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { enginesTable, modelYearsTable } from "./vehicles";

export const commonProblemsTable = pgTable("common_problems", {
  id: serial("id").primaryKey(),
  modelYearId: integer("model_year_id").notNull().references(() => modelYearsTable.id, { onDelete: "cascade" }),
  engineId: integer("engine_id").references(() => enginesTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  typicalMileageStart: integer("typical_mileage_start").notNull(),
  typicalMileageEnd: integer("typical_mileage_end").notNull(),
  repairCostLowUsd: integer("repair_cost_low_usd").notNull(),
  repairCostHighUsd: integer("repair_cost_high_usd").notNull(),
  severity: text("severity").notNull(),
  isDemo: boolean("is_demo").notNull().default(true),
});

export const recallsTable = pgTable("recalls", {
  id: serial("id").primaryKey(),
  modelYearId: integer("model_year_id").notNull().references(() => modelYearsTable.id, { onDelete: "cascade" }),
  campaignCode: text("campaign_code"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  announcedDate: date("announced_date", { mode: "string" }),
  sourceUrl: text("source_url"),
  isVerified: boolean("is_verified").notNull().default(false),
  isDemo: boolean("is_demo").notNull().default(true),
});

export const safetyRatingsTable = pgTable("safety_ratings", {
  id: serial("id").primaryKey(),
  modelYearId: integer("model_year_id").notNull().references(() => modelYearsTable.id, { onDelete: "cascade" }),
  agency: text("agency").notNull(),
  rating: text("rating"),
  sourceUrl: text("source_url"),
  isVerified: boolean("is_verified").notNull().default(false),
  isDemo: boolean("is_demo").notNull().default(true),
});

export const insertCommonProblemSchema = createInsertSchema(commonProblemsTable).omit({ id: true });
export const insertRecallSchema = createInsertSchema(recallsTable).omit({ id: true });
export const insertSafetyRatingSchema = createInsertSchema(safetyRatingsTable).omit({ id: true });
export type InsertCommonProblem = z.infer<typeof insertCommonProblemSchema>;
export type CommonProblem = typeof commonProblemsTable.$inferSelect;
export type InsertRecall = z.infer<typeof insertRecallSchema>;
export type Recall = typeof recallsTable.$inferSelect;
export type InsertSafetyRating = z.infer<typeof insertSafetyRatingSchema>;
export type SafetyRating = typeof safetyRatingsTable.$inferSelect;